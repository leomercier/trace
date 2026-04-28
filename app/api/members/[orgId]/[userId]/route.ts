import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { orgId: string; userId: string } },
) {
  const supabase = createClient();
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { error } = await supabase
    .from("organisation_members")
    .update({ role: parsed.data.role })
    .eq("organisation_id", params.orgId)
    .eq("user_id", params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { orgId: string; userId: string } },
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("organisation_members")
    .delete()
    .eq("organisation_id", params.orgId)
    .eq("user_id", params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
