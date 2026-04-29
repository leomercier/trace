import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Org home is a redirect-only route — we deliberately don't show a project
 * list. Instead, we drop the user straight into the canvas of the most
 * recently-edited page in the org. If the org has no projects/pages yet,
 * we create a starter project + page automatically and redirect there.
 *
 * The full project/page management UI lives inside the editor (page menu
 * in the top bar). No reason to bounce the user through extra screens.
 */
export default async function OrgHome({
  params,
}: {
  params: { orgSlug: string };
}) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();
  if (!org) notFound();

  // Pick the most recently updated page across all projects in this org.
  const { data: projects } = await supabase
    .from("projects")
    .select("id, updated_at")
    .eq("organisation_id", org.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  let projectId = projects?.[0]?.id;

  if (!projectId) {
    // Empty org → bootstrap a starter project + page via service role so we
    // never hit RLS gotchas during onboarding.
    const svc = createServiceClient();
    const { data: project } = await svc
      .from("projects")
      .insert({
        organisation_id: org.id,
        name: "Untitled project",
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();
    if (!project) {
      // Surface a soft failure rather than crashing — fall back to /app.
      redirect("/app");
    }
    projectId = project!.id;
    await svc
      .from("pages")
      .insert({
        project_id: projectId,
        name: "Untitled page",
        created_by: u.user?.id ?? null,
      });
  }

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("project_id", projectId!)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pageId = page?.id;
  if (!pageId) {
    const svc = createServiceClient();
    const { data: created } = await svc
      .from("pages")
      .insert({
        project_id: projectId!,
        name: "Untitled page",
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();
    pageId = created?.id;
  }

  if (!pageId) redirect("/app");
  redirect(`/app/${org.slug}/${projectId}/${pageId}`);
}
