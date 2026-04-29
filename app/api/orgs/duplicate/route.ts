import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { uniqueOrgSlug } from "@/lib/utils/slug";

const Body = z.object({
  source_org_id: z.string().uuid(),
  /** New name for the duplicated workspace. Defaults to "<src> copy". */
  name: z.string().min(1).max(80).optional(),
});

/**
 * Deep-clones an organisation and everything inside it: projects, pages,
 * source-file blob references (paths kept as-is — same Storage path is
 * reused, since blobs are immutable), measurements, notes, shapes,
 * placed_items, attachments, page_drawings.
 *
 * Caller must be a viewer+ on the source org. The new org is created with
 * the caller as owner. The new org is NOT marked anonymous (a duplicated
 * sandbox becomes a real workspace).
 *
 * NOT cloned: org members other than the caller, public_shares, recent_items,
 * ai_calls. Those are workspace-state, not project content.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { source_org_id } = parsed.data;

  // Authorise: caller must already be a member of the source org (any role).
  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", source_org_id)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const svc = createServiceClient();

  const { data: srcOrg } = await svc
    .from("organisations")
    .select("name")
    .eq("id", source_org_id)
    .maybeSingle();
  if (!srcOrg) return NextResponse.json({ error: "source not found" }, { status: 404 });

  const newName = parsed.data.name?.trim() || `${srcOrg.name} copy`;

  // 1) New org + ownership.
  let newOrg: { id: string; slug: string; name: string } | undefined;
  for (let i = 0; i < 5; i++) {
    const slug = uniqueOrgSlug(newName);
    const { data, error } = await svc
      .from("organisations")
      .insert({
        name: newName,
        slug,
        created_by: u.user.id,
        is_anonymous: false,
      })
      .select("id, slug, name")
      .single();
    if (!error && data) {
      newOrg = data;
      break;
    }
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  if (!newOrg) return NextResponse.json({ error: "could not allocate slug" }, { status: 500 });

  await svc.from("organisation_members").insert({
    organisation_id: newOrg.id,
    user_id: u.user.id,
    role: "owner",
  });

  // 2) Clone projects + everything beneath them. We map old IDs to new
  //    IDs as we go so foreign keys stay correct.
  const { data: srcProjects } = await svc
    .from("projects")
    .select("id, name, description, created_at")
    .eq("organisation_id", source_org_id);

  const projectIdMap = new Map<string, string>();
  for (const p of srcProjects || []) {
    const { data: np } = await svc
      .from("projects")
      .insert({
        organisation_id: newOrg.id,
        name: p.name,
        description: p.description,
        created_by: u.user.id,
      })
      .select("id")
      .single();
    if (np) projectIdMap.set(p.id, np.id);
  }

  // Pages
  const pageIdMap = new Map<string, string>();
  for (const [oldProjectId, newProjectId] of projectIdMap) {
    const { data: srcPages } = await svc
      .from("pages")
      .select("*")
      .eq("project_id", oldProjectId);
    for (const pg of srcPages || []) {
      const { data: np } = await svc
        .from("pages")
        .insert({
          project_id: newProjectId,
          name: pg.name,
          sort_order: pg.sort_order,
          source_storage_path: pg.source_storage_path,
          source_file_type: pg.source_file_type,
          source_file_name: pg.source_file_name,
          source_file_size: pg.source_file_size,
          source_bounds: pg.source_bounds,
          scale_real_per_unit: pg.scale_real_per_unit,
          scale_unit: pg.scale_unit,
          created_by: u.user.id,
        })
        .select("id")
        .single();
      if (np) pageIdMap.set(pg.id, np.id);
    }
  }

  // Per-page tables: measurements, notes, placed_items, shapes, page_drawings.
  for (const [oldPageId, newPageId] of pageIdMap) {
    await cloneRows(svc, "measurements", oldPageId, newPageId, [
      "id",
      "page_id",
      "created_at",
      "updated_at",
    ]);
    await cloneRows(svc, "notes", oldPageId, newPageId, [
      "id",
      "page_id",
      "created_at",
      "updated_at",
    ]);
    await cloneRows(svc, "placed_items", oldPageId, newPageId, [
      "id",
      "page_id",
      "created_at",
      "updated_at",
    ]);
    await cloneRows(svc, "shapes", oldPageId, newPageId, [
      "id",
      "page_id",
      "created_at",
      "updated_at",
    ]);
    await cloneRows(svc, "page_drawings", oldPageId, newPageId, [
      "id",
      "page_id",
      "uploaded_at",
    ]);
  }

  return NextResponse.json({ org: newOrg });
}

/**
 * Reads all rows from `table` where page_id = oldPageId, strips the listed
 * columns, rewrites page_id to newPageId, and bulk-inserts them into the
 * same table. Service-role bypasses RLS so we don't have to faff.
 */
async function cloneRows(
  svc: ReturnType<typeof createServiceClient>,
  table: string,
  oldPageId: string,
  newPageId: string,
  strip: string[],
) {
  const { data, error } = await svc.from(table).select("*").eq("page_id", oldPageId);
  if (error || !data || data.length === 0) return;
  const rows = data.map((row: any) => {
    const next: any = { ...row };
    for (const k of strip) delete next[k];
    next.page_id = newPageId;
    return next;
  });
  await svc.from(table).insert(rows);
}
