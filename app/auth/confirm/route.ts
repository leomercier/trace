import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Token-hash confirm endpoint. Use this in the Supabase email template:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/app
 *
 * This avoids the PKCE round-trip and works even when the user opens the
 * email on a different device than where they requested it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/app";
  const invite = url.searchParams.get("invite") || undefined;

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=missing_token", url));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as any,
    token_hash: tokenHash,
  });
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=" + encodeURIComponent(error.message), url),
    );
  }
  if (invite) {
    return NextResponse.redirect(new URL(`/api/invite/${invite}`, url));
  }
  return NextResponse.redirect(new URL(`/post-login?next=${encodeURIComponent(next)}`, url));
}
