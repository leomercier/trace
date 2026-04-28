import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewProjectButton } from "@/components/app/NewProjectButton";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function OrgHome({
  params,
}: {
  params: { orgSlug: string };
}) {
  const supabase = createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, created_at, updated_at")
    .eq("organisation_id", org.id)
    .order("updated_at", { ascending: false });

  const { data: u } = await supabase.auth.getUser();
  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("user_id", u.user!.id)
    .maybeSingle();

  const canCreate = mem?.role === "owner" || mem?.role === "admin" || mem?.role === "editor";

  return (
    <main className="mx-auto max-w-6xl px-6 pt-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Projects</h1>
          <p className="mt-1 text-ink-muted">{org.name}</p>
        </div>
        {canCreate ? <NewProjectButton orgId={org.id} orgSlug={org.slug} /> : null}
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(projects || []).map((p) => (
          <li key={p.id}>
            <Link
              href={`/app/${org.slug}/${p.id}`}
              className="block h-full rounded-lg border border-border bg-panel p-5 transition-colors hover:border-border-strong"
            >
              <div className="font-serif text-xl">{p.name}</div>
              {p.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                  {p.description}
                </p>
              ) : null}
              <div className="mt-4 text-xs text-ink-faint">
                Updated {formatDate(p.updated_at)}
              </div>
            </Link>
          </li>
        ))}
        {(!projects || projects.length === 0) && (
          <li className="md:col-span-2 lg:col-span-3">
            <div className="rounded-lg border border-dashed border-border bg-panel/50 p-10 text-center">
              <p className="text-ink-muted">No projects yet.</p>
              {canCreate ? (
                <div className="mt-4">
                  <NewProjectButton orgId={org.id} orgSlug={org.slug} />
                </div>
              ) : null}
            </div>
          </li>
        )}
      </ul>
    </main>
  );
}
