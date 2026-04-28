import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { uniqueOrgSlug } from "@/lib/utils/slug";

const Body = z.object({ name: z.string().min(1).max(80) });

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const name = parsed.data.name.trim();
  // Use the service-role client for the insert + add-owner pair so RLS
  // can't reject either step. We've already verified auth.uid() above.
  const svc = createServiceClient();

  let org: { id: string; slug: string; name: string } | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = uniqueOrgSlug(name);
    const { data, error } = await svc
      .from("organisations")
      .insert({ name, slug, created_by: u.user.id })
      .select("id, slug, name")
      .single();
    if (!error && data) {
      org = data;
      break;
    }
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  if (!org) return NextResponse.json({ error: "could not create org" }, { status: 500 });

  const { error: memErr } = await svc.from("organisation_members").insert({
    organisation_id: org.id,
    user_id: u.user.id,
    role: "owner",
  });
  if (memErr) {
    // Roll back the org so we don't leave an orphan with no members.
    await svc.from("organisations").delete().eq("id", org.id);
    return NextResponse.json({ error: memErr.message }, { status: 400 });
  }

  return NextResponse.json({ org });
}
