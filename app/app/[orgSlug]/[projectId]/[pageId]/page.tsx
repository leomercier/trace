import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Editor } from "@/components/canvas/Editor";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: { orgSlug: string; projectId: string; pageId: string };
}) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, slug, is_anonymous, expires_at")
    .eq("slug", params.orgSlug)
    .maybeSingle();

  // Org wasn't visible via RLS. Either it doesn't exist, or it's an anon
  // sandbox the visitor isn't yet a member of. Check via service role and,
  // if it's an anon org, route them through /join/* which signs them in
  // anonymously and adds them as an editor.
  if (!org) {
    const svc = createServiceClient();
    const { data: anonOrg } = await svc
      .from("organisations")
      .select("id, is_anonymous, expires_at")
      .eq("slug", params.orgSlug)
      .maybeSingle();
    if (
      anonOrg?.is_anonymous &&
      (!anonOrg.expires_at || new Date(anonOrg.expires_at).getTime() > Date.now())
    ) {
      redirect(
        `/join/${params.orgSlug}?next=${encodeURIComponent(
          `/app/${params.orgSlug}/${params.projectId}/${params.pageId}`,
        )}`,
      );
    }
    notFound();
  }

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", params.pageId)
    .eq("project_id", params.projectId)
    .maybeSingle();
  if (!page) notFound();

  // Membership check. If they have a session and aren't a member yet, but
  // the org is anonymous, auto-join semantics still apply (the prior
  // service-role redirect handles the no-session case; this branch covers
  // already-signed-in users hitting someone else's sandbox).
  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("user_id", u.user!.id)
    .maybeSingle();
  if (!mem) {
    if (org.is_anonymous) {
      redirect(
        `/join/${org.slug}?next=${encodeURIComponent(
          `/app/${org.slug}/${params.projectId}/${params.pageId}`,
        )}`,
      );
    }
    notFound();
  }

  const [
    { data: project },
    { data: measurements },
    { data: notes },
    { data: placedItems },
    { data: pages },
    { data: pageDrawings },
    { data: shapes },
    framesRes,
  ] = await Promise.all([
    supabase.from("projects").select("name").eq("id", params.projectId).maybeSingle(),
    supabase.from("measurements").select("*").eq("page_id", page.id),
    supabase.from("notes").select("*").eq("page_id", page.id),
    supabase
      .from("placed_items")
      .select("*")
      .eq("page_id", page.id)
      .order("z_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("pages")
      .select("id, name")
      .eq("project_id", params.projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("page_drawings")
      .select("*")
      .eq("page_id", page.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("shapes")
      .select("*")
      .eq("page_id", page.id)
      .order("z_order", { ascending: true }),
    // The frames table was added in 0011; tolerate it being absent on
    // databases that haven't migrated yet so the editor still loads.
    supabase
      .from("frames")
      .select("*")
      .eq("page_id", page.id)
      .order("z_order", { ascending: true })
      .then(
        (res) => res,
        () => ({ data: [] as any[] }),
      ),
  ]);
  const frames = (framesRes as any)?.data ?? [];

  let signedUrl: string | null = null;
  if (page.source_storage_path) {
    const { data: signed } = await supabase.storage
      .from("drawings")
      .createSignedUrl(page.source_storage_path, 60 * 60);
    signedUrl = signed?.signedUrl || null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, email")
    .eq("id", u.user!.id)
    .maybeSingle();

  return (
    <Editor
      initial={{
        page: page as any,
        measurements: (measurements || []) as any,
        notes: (notes || []) as any,
        placedItems: (placedItems || []) as any,
        shapes: (shapes || []) as any,
        frames: (frames || []) as any,
        role: mem.role as any,
        user: {
          id: u.user!.id,
          name: profile?.display_name || u.user!.email || "User",
          email: u.user!.email || "",
          avatar: profile?.avatar_url || null,
        },
        orgId: org.id,
        orgSlug: params.orgSlug,
        orgIsAnonymous: !!org.is_anonymous,
        orgExpiresAt: org.expires_at ?? null,
        projectId: params.projectId,
        projectName: project?.name || "",
        pages: (pages || []) as any,
        signedUrl,
        pageDrawings: (pageDrawings || []) as any,
      }}
    />
  );
}
