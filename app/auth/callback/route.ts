import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles both magic-link (?token_hash=...&type=...) and OAuth (?code=...) callbacks.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/app";
  const invite = url.searchParams.get("invite") || undefined;

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(error.message), url));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash: tokenHash,
    });
    if (error) return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(error.message), url));
  }

  // If they came in with an invite token, route them through accept-invite.
  if (invite) {
    return NextResponse.redirect(new URL(`/api/invite/${invite}`, url));
  }
  // Otherwise, /post-login does any pending org setup.
  return NextResponse.redirect(new URL(`/post-login?next=${encodeURIComponent(next)}`, url));
}
