import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgTopBar } from "@/components/app/OrgTopBar";
import { OrgMobileBar } from "@/components/app/OrgMobileBar";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const userMeta = {
    id: u.user.id,
    email: u.user.email || "",
    name: u.user.user_metadata?.name || u.user.email || "User",
    avatar_url: u.user.user_metadata?.avatar_url || null,
  };

  // Desktop top bar shows on md+. Mobile gets a compact bar that the editor
  // can override (it positions its own bar at the same z-index above the
  // canvas, and we mark the org one with .org-mobile-bar so the editor's
  // wrapper hides it via CSS when present).
  return (
    <div className="min-h-screen bg-bg">
      <OrgTopBar org={org} role={mem.role as any} hideOnMobile user={userMeta} />
      <OrgMobileBar org={org} role={mem.role as any} user={userMeta} />
      {children}
    </div>
  );
}
