import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email/send";
import { randomSlug } from "@/lib/utils/slug";

const Body = z.object({
  organisation_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { organisation_id, email, role } = parsed.data;

  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisation_id)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!mem || (mem.role !== "owner" && mem.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = `${randomSlug(6)}${randomSlug(6)}${randomSlug(6)}${randomSlug(6)}`;

  const { data: invite, error } = await supabase
    .from("organisation_invites")
    .insert({
      organisation_id,
      email: email.toLowerCase(),
      role,
      token,
      invited_by: u.user.id,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", organisation_id)
    .single();
  const { data: inviter } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", u.user.id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const acceptUrl = `${appUrl}/api/invite/${token}`;

  await sendInviteEmail({
    to: email,
    inviter: inviter?.display_name || inviter?.email || "Someone",
    orgName: org?.name || "the workspace",
    acceptUrl,
    role,
  });

  return NextResponse.json({ invite, accept_url: acceptUrl });
}

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });
  const { data, error } = await supabase
    .from("organisation_invites")
    .select("*")
    .eq("organisation_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ invites: data || [] });
}
