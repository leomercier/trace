import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Project home is a redirect to the most recently-updated page in the
 * project. If the project has no pages, we auto-create one. The page list
 * is accessible from inside the editor's hamburger menu, not as a
 * standalone screen.
 */
export default async function ProjectHome({
  params,
}: {
  params: { orgSlug: string; projectId: string };
}) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", params.projectId)
    .eq("organisation_id", org.id)
    .maybeSingle();
  if (!project) notFound();

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pageId = page?.id;
  if (!pageId) {
    const svc = createServiceClient();
    const { data: created } = await svc
      .from("pages")
      .insert({
        project_id: project.id,
        name: "Untitled page",
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();
    pageId = created?.id;
  }

  if (!pageId) redirect(`/app/${org.slug}`);
  redirect(`/app/${org.slug}/${project.id}/${pageId}`);
}
