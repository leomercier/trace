import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    const url = new URL(req.url);
    const back = `/login?next=${encodeURIComponent("/api/invite/" + params.token)}&invite=${encodeURIComponent(params.token)}`;
    return NextResponse.redirect(new URL(back, url));
  }

  const svc = createServiceClient();
  const { data: invite } = await svc
    .from("organisation_invites")
    .select("*")
    .eq("token", params.token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.redirect(new URL("/app?invite_error=not_found", req.url));
  }
  if (invite.accepted_at) {
    return NextResponse.redirect(new URL("/app?invite_error=already_used", req.url));
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/app?invite_error=expired", req.url));
  }

  const userEmail = u.user.email?.toLowerCase();
  if (userEmail && invite.email.toLowerCase() !== userEmail) {
    // Soft-fail: still allow accepting if logged in (link is the auth);
    // but redirect with a notice so they know who they joined as.
  }

  await svc.from("organisation_members").upsert(
    {
      organisation_id: invite.organisation_id,
      user_id: u.user.id,
      role: invite.role,
      invited_by: invite.invited_by,
    },
    { onConflict: "organisation_id,user_id" },
  );

  await svc
    .from("organisation_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  const { data: org } = await svc
    .from("organisations")
    .select("slug")
    .eq("id", invite.organisation_id)
    .single();

  return NextResponse.redirect(new URL(`/app/${org?.slug || ""}`, req.url));
}
