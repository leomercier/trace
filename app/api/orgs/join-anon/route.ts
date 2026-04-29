import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const Body = z.object({
  org_id: z.string().uuid(),
});

/**
 * Auto-join the calling user to an anonymous org as an `editor`. Used by
 * the editor route when a visitor lands on the URL of someone else's
 * sandbox — anon orgs are public-by-URL, so anyone can collaborate.
 *
 * Refuses if:
 *   - The caller has no session.
 *   - The org isn't flagged is_anonymous (regular orgs require an invite).
 *   - The org has expired (cleanup will sweep it shortly anyway).
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
    .eq("id", parsed.data.org_id)
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

  return NextResponse.json({ ok: true });
}
