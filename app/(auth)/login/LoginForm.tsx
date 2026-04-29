"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { EVENTS, track } from "@/lib/analytics";

export function LoginForm() {
  const supabase = createClient();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const inviteToken = params.get("invite") || undefined;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Prefer the live origin so OAuth/magic-link redirects return to the
  // same browser/host that started the flow. PKCE stores the code
  // verifier as a cookie on the origin that initiated the request — if
  // the redirect lands on a different host (preview URL vs. canonical,
  // localhost vs. Vercel), the cookie isn't sent and exchangeCodeForSession
  // fails with "PKCE code verifier not found in storage".
  const origin =
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  const redirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}${
        inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ""
      }`
    : undefined;

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) setError(error.message);
    else {
      track(EVENTS.login, { method: "magic_link" });
      setSent(true);
    }
  }

  async function onGoogle() {
    setError(null);
    track(EVENTS.login, { method: "google" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  if (sent) {
    return (
      <div className="rounded-md border border-trace-black/15 bg-trace-white p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-trace-black/50">
          Magic link sent
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold">
          Check your email
        </h2>
        <p className="mt-2 text-trace-black/70">
          We sent a sign-in link to{" "}
          <span className="text-trace-black">{email}</span>. Open it on this
          device.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button onClick={onGoogle} variant="secondary" size="lg" className="w-full">
        <GoogleIcon /> Continue with Google
      </Button>
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-trace-black/50">
        <span className="h-px flex-1 bg-trace-black/15" />
        Or
        <span className="h-px flex-1 bg-trace-black/15" />
      </div>
      <form onSubmit={onMagicLink} className="space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
          />
        </div>
        {error ? <p className="text-sm text-trace-error">{error}</p> : null}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Send magic link
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0a9 9 0 0 0-8.04 4.96l2.99 2.34C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
