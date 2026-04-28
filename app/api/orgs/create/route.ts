import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

  // Try a few slugs in case of collision.
  let org;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = uniqueOrgSlug(name);
    const { data, error } = await supabase
      .from("organisations")
      .insert({ name, slug, created_by: u.user.id })
      .select("*")
      .single();
    if (!error) {
      org = data;
      break;
    }
    if (!error.message.includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  if (!org) return NextResponse.json({ error: "could not create org" }, { status: 500 });

  const { error: memErr } = await supabase
    .from("organisation_members")
    .insert({
      organisation_id: org.id,
      user_id: u.user.id,
      role: "owner",
    });
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });

  return NextResponse.json({ org });
}
