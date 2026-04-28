import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MembersTab } from "./MembersTab";
import { InvitesTab } from "./InvitesTab";

export const dynamic = "force-dynamic";

export default async function Settings({
  params,
}: {
  params: { orgSlug: string };
}) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, slug")
    .eq("slug", params.orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", org.id)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!mem) notFound();
  if (mem.role !== "owner" && mem.role !== "admin")
    redirect(`/app/${org.slug}`);

  // members + profiles
  const { data: members } = await supabase
    .from("organisation_members")
    .select("user_id, role, joined_at, profiles:user_id (id, email, display_name, avatar_url)")
    .eq("organisation_id", org.id);

  const { data: invites } = await supabase
    .from("organisation_invites")
    .select("*")
    .eq("organisation_id", org.id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-6 pt-10">
      <Link
        href={`/app/${org.slug}`}
        className="text-xs uppercase tracking-wider text-ink-faint hover:text-ink"
      >
        ← {org.name}
      </Link>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Settings</h1>
      <div className="mt-10 space-y-12">
        <section>
          <h2 className="font-serif text-2xl">Members</h2>
          <MembersTab
            orgId={org.id}
            currentUserId={u.user.id}
            currentRole={mem.role as any}
            members={(members || []).map((m: any) => ({
              user_id: m.user_id,
              role: m.role,
              email: m.profiles?.email || "",
              display_name: m.profiles?.display_name || m.profiles?.email || "",
              avatar_url: m.profiles?.avatar_url || null,
              joined_at: m.joined_at,
            }))}
          />
        </section>

        <section>
          <h2 className="font-serif text-2xl">Invitations</h2>
          <InvitesTab orgId={org.id} initial={invites || []} />
        </section>
      </div>
    </main>
  );
}
