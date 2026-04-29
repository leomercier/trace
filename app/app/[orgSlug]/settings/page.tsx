import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MembersTab } from "./MembersTab";
import { InvitesTab } from "./InvitesTab";
import { SectionLabel } from "@/components/marketing/SectionLabel";

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

  const { data: members } = await supabase
    .from("organisation_members")
    .select(
      "user_id, role, joined_at, profiles:user_id (id, email, display_name, avatar_url)",
    )
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
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-trace-black/60 hover:text-trace-black"
      >
        <ArrowLeft className="size-3.5" />
        {org.name}
      </Link>

      <div className="mt-6">
        <SectionLabel index="01" label={`Workspace · ${org.slug}`} />
      </div>
      <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1] tracking-tight md:text-[64px]">
        Settings.
      </h1>
      <p className="mt-3 max-w-xl text-trace-black/70">
        Manage who has access. Invite teammates, change roles, revoke links.
      </p>

      <div className="mt-12 space-y-16">
        <section id="members">
          <SettingsSectionHeader
            index="02"
            label="Members"
            title="Members"
            body="People who can view or edit work in this workspace."
          />
          <div className="mt-6">
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
          </div>
        </section>

        <section id="invites">
          <SettingsSectionHeader
            index="03"
            label="Invitations"
            title="Invitations"
            body="Send a link by email or copy and share it directly."
          />
          <div className="mt-6">
            <InvitesTab orgId={org.id} initial={invites || []} />
          </div>
        </section>
      </div>

      <div className="mt-20 border-t border-trace-black/10 py-6 font-mono text-[11px] uppercase tracking-[0.18em] text-trace-black/50">
        <span>Settings · {org.slug}</span>
      </div>
    </main>
  );
}

function SettingsSectionHeader({
  index,
  label,
  title,
  body,
}: {
  index: string;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <SectionLabel index={index} label={label} />
      <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight tracking-tight md:text-[36px]">
        {title}
      </h2>
      <p className="mt-2 max-w-xl text-trace-black/70">{body}</p>
    </div>
  );
}
