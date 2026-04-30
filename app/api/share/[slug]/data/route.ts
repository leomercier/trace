import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyShareToken } from "@/lib/utils/password";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const svc = createServiceClient();
  const { data: share } = await svc
    .from("public_shares")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!share) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (share.password_hash) {
    const tok = cookies().get(`trace_share_${params.slug}`)?.value;
    if (!verifyShareToken(params.slug, tok)) {
      return NextResponse.json({ error: "needs_password" }, { status: 401 });
    }
  }

  if (share.scope === "page") {
    const { data: page } = await svc
      .from("pages")
      .select("*")
      .eq("id", share.page_id!)
      .single();
    if (!page) return NextResponse.json({ error: "missing" }, { status: 404 });
    const [
      { data: measurements },
      { data: notes },
      { data: placedItems },
      framesRes,
    ] = await Promise.all([
      svc.from("measurements").select("*").eq("page_id", page.id),
      svc.from("notes").select("*").eq("page_id", page.id),
      svc.from("placed_items").select("*").eq("page_id", page.id),
      svc
        .from("frames")
        .select("*")
        .eq("page_id", page.id)
        .then(
          (res) => res,
          () => ({ data: [] as any[] }),
        ),
    ]);
    const frames = (framesRes as any)?.data ?? [];
    let signedUrl: string | null = null;
    if (page.source_storage_path) {
      const { data } = await svc.storage
        .from("drawings")
        .createSignedUrl(page.source_storage_path, 60 * 60);
      signedUrl = data?.signedUrl || null;
    }
    return NextResponse.json({
      kind: "page",
      page,
      measurements: measurements || [],
      notes: notes || [],
      placedItems: placedItems || [],
      frames: frames || [],
      signedUrl,
      allow_comments: share.allow_comments,
    });
  } else {
    const { data: project } = await svc
      .from("projects")
      .select("id, name, description")
      .eq("id", share.project_id!)
      .single();
    const { data: pages } = await svc
      .from("pages")
      .select("id, name, source_file_type, thumbnail_path")
      .eq("project_id", share.project_id!)
      .order("sort_order", { ascending: true });
    return NextResponse.json({
      kind: "project",
      project,
      pages: pages || [],
      allow_comments: share.allow_comments,
    });
  }
}
