import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { signShareToken, verifyPassword } from "@/lib/utils/password";

const Body = z.object({ password: z.string().optional() });

export async function POST(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json || {});
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const svc = createServiceClient();
  const { data: share } = await svc
    .from("public_shares")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!share) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (share.password_hash) {
    const ok = await verifyPassword(parsed.data.password || "", share.password_hash);
    if (!ok) return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  const token = signShareToken(params.slug);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(`trace_share_${params.slug}`, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  return res;
}
