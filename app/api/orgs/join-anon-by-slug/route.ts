import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const Body = z.object({ slug: z.string().min(1).max(120) });

/**
 * Slug-based variant of /api/orgs/join-anon. The /join/{orgSlug} client
 * page calls this with just the slug — we resolve the org via service
 * role, refuse if it isn't anonymous or has expired, and upsert the
 * caller as an editor in one round-trip.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const svc = createServiceClient();
  const { data: org } = await svc
    .from("organisations")
    .select("id, is_anonymous, expires_at")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!org.is_anonymous) {
    return NextResponse.json({ error: "not_public" }, { status: 403 });
  }
  if (org.expires_at && new Date(org.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  await svc.from("organisation_members").upsert(
    {
      organisation_id: org.id,
      user_id: u.user.id,
      role: "editor",
    },
    { onConflict: "organisation_id,user_id" },
  );

  return NextResponse.json({ ok: true, org_id: org.id });
}
