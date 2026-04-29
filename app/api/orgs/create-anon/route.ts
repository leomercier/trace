import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { uniqueOrgSlug, randomSlug } from "@/lib/utils/slug";

/**
 * Bootstraps an anonymous workspace in one shot:
 *   - Creates an organisation flagged is_anonymous, expires_at = now() + 7d
 *   - Adds the calling (anon) user as owner
 *   - Creates a project + a single page
 *   - Mints a public_shares row so the workspace is shareable via /p/{slug}
 *     by default — anon spaces are public.
 *
 * Caller MUST have a session (anon or otherwise). The /new client page
 * does signInAnonymously() before calling this.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const isAnon = (u.user as any).is_anonymous === true;
  const svc = createServiceClient();

  // 1) Create the org.
  const expiresAt = isAnon
    ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    : null;

  let org: { id: string; slug: string; name: string } | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = uniqueOrgSlug(isAnon ? "test" : "workspace");
    const { data, error } = await svc
      .from("organisations")
      .insert({
        name: isAnon ? "Quick test" : "Workspace",
        slug,
        created_by: u.user.id,
        is_anonymous: isAnon,
        expires_at: expiresAt,
      })
      .select("id, slug, name")
      .single();
    if (!error && data) {
      org = data;
      break;
    }
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  if (!org) {
    return NextResponse.json({ error: "could not create workspace" }, { status: 500 });
  }

  // 2) Add the user as owner.
  const { error: memErr } = await svc.from("organisation_members").insert({
    organisation_id: org.id,
    user_id: u.user.id,
    role: "owner",
  });
  if (memErr) {
    await svc.from("organisations").delete().eq("id", org.id);
    return NextResponse.json({ error: memErr.message }, { status: 400 });
  }

  // 3) Project + page.
  const { data: project, error: projErr } = await svc
    .from("projects")
    .insert({
      organisation_id: org.id,
      name: isAnon ? "Sandbox" : "Untitled project",
      created_by: u.user.id,
    })
    .select("id")
    .single();
  if (projErr || !project) {
    await svc.from("organisations").delete().eq("id", org.id);
    return NextResponse.json(
      { error: projErr?.message || "project failed" },
      { status: 400 },
    );
  }

  const { data: page, error: pageErr } = await svc
    .from("pages")
    .insert({
      project_id: project.id,
      name: "Untitled page",
      created_by: u.user.id,
    })
    .select("id")
    .single();
  if (pageErr || !page) {
    await svc.from("organisations").delete().eq("id", org.id);
    return NextResponse.json(
      { error: pageErr?.message || "page failed" },
      { status: 400 },
    );
  }

  // 4) For anon spaces: mint a public_share so the URL is shareable
  //    immediately ("anon spaces are public by default on a URL").
  let shareSlug: string | null = null;
  if (isAnon) {
    const slug = `${randomSlug(8)}${randomSlug(4)}`;
    const { data: share } = await svc
      .from("public_shares")
      .insert({
        scope: "project",
        project_id: project.id,
        slug,
        password_hash: null,
        allow_comments: true,
        created_by: u.user.id,
      })
      .select("slug")
      .single();
    shareSlug = share?.slug || null;
  }

  return NextResponse.json({
    org: { id: org.id, slug: org.slug, name: org.name },
    projectId: project.id,
    pageId: page.id,
    shareSlug,
    isAnonymous: isAnon,
    expiresAt,
  });
}
