import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", params.pageId)
    .eq("project_id", params.projectId)
    .maybeSingle();
  if (!page) notFound();

  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("user_id", u.user!.id)
    .maybeSingle();
  if (!mem) notFound();

  const [{ data: project }, { data: measurements }, { data: notes }, { data: pages }] = await Promise.all([
    supabase.from("projects").select("name").eq("id", params.projectId).maybeSingle(),
    supabase.from("measurements").select("*").eq("page_id", page.id),
    supabase.from("notes").select("*").eq("page_id", page.id),
    supabase
      .from("pages")
      .select("id, name")
      .eq("project_id", params.projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

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
        role: mem.role as any,
        user: {
          id: u.user!.id,
          name: profile?.display_name || u.user!.email || "User",
          email: u.user!.email || "",
          avatar: profile?.avatar_url || null,
        },
        orgId: org.id,
        orgSlug: params.orgSlug,
        projectId: params.projectId,
        projectName: project?.name || "",
        pages: (pages || []) as any,
        signedUrl,
      }}
    />
  );
}
