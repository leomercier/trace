import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/utils/password";
import { randomSlug } from "@/lib/utils/slug";

const Body = z.object({
  scope: z.enum(["project", "page"]),
  target_id: z.string().uuid(),
  password: z.string().nullable().optional(),
  allow_comments: z.boolean().optional(),
});

export async function GET(req: Request) {
  const supabase = createClient();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const id = url.searchParams.get("id");
  if (scope !== "project" && scope !== "page") {
    return NextResponse.json({ error: "invalid scope" }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const col = scope === "project" ? "project_id" : "page_id";
  const { data, error } = await supabase
    .from("public_shares")
    .select("*")
    .eq("scope", scope)
    .eq(col, id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ shares: data || [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { scope, target_id, password, allow_comments } = parsed.data;

  const slug = `${randomSlug(8)}${randomSlug(4)}`;
  const password_hash = password ? await hashPassword(password) : null;

  const insert =
    scope === "project"
      ? { scope, project_id: target_id, slug, password_hash, allow_comments: !!allow_comments }
      : { scope, page_id: target_id, slug, password_hash, allow_comments: !!allow_comments };

  const { data, error } = await supabase
    .from("public_shares")
    .insert(insert as any)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ share: data });
}
