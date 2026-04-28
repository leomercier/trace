import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewPageButton } from "@/components/app/NewPageButton";
import { ProjectShareButton } from "@/components/app/ProjectShareButton";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: { orgSlug: string; projectId: string };
}) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.projectId)
    .eq("organisation_id", org.id)
    .maybeSingle();
  if (!project) notFound();

  const { data: pages } = await supabase
    .from("pages")
    .select("id, name, source_file_name, source_file_type, thumbnail_path, updated_at")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("user_id", u.user!.id)
    .maybeSingle();
  const role = (mem?.role || "viewer") as "owner" | "admin" | "editor" | "viewer";
  const canEdit = role !== "viewer";
  const canAdmin = role === "owner" || role === "admin";

  return (
    <main className="mx-auto max-w-6xl px-6 pt-10">
      <div className="flex items-end justify-between">
        <div>
          <Link
            href={`/app/${org.slug}`}
            className="text-xs uppercase tracking-wider text-ink-faint hover:text-ink"
          >
            ← All projects
          </Link>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">{project.name}</h1>
          {project.description ? (
            <p className="mt-1 max-w-xl text-ink-muted">{project.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {canAdmin ? (
            <ProjectShareButton projectId={project.id} />
          ) : null}
          {canEdit ? (
            <NewPageButton projectId={project.id} orgId={org.id} orgSlug={org.slug} />
          ) : null}
        </div>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(pages || []).map((p) => (
          <li key={p.id}>
            <Link
              href={`/app/${org.slug}/${project.id}/${p.id}`}
              className="block overflow-hidden rounded-lg border border-border bg-panel transition-colors hover:border-border-strong"
            >
              <div className="aspect-[4/3] bg-canvas">
                {p.thumbnail_path ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${p.thumbnail_path}`}
                    alt={p.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-faint">
                    {p.source_file_type ? p.source_file_type.toUpperCase() : "—"}
                  </div>
                )}
              </div>
              <div className="border-t border-border p-4">
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-ink-faint">
                  {p.source_file_name || "Empty"} · {formatDate(p.updated_at)}
                </div>
              </div>
            </Link>
          </li>
        ))}
        {(!pages || pages.length === 0) && (
          <li className="md:col-span-2 lg:col-span-3">
            <div className="rounded-lg border border-dashed border-border bg-panel/50 p-10 text-center">
              <p className="text-ink-muted">No pages yet.</p>
              {canEdit ? (
                <div className="mt-4">
                  <NewPageButton
                    projectId={project.id}
                    orgId={org.id}
                    orgSlug={org.slug}
                  />
                </div>
              ) : null}
            </div>
          </li>
        )}
      </ul>
    </main>
  );
}
