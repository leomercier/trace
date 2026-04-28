"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function LoginForm() {
  const supabase = createClient();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const inviteToken = params.get("invite") || undefined;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}${
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
    else setSent(true);
  }

  async function onGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  if (sent) {
    return (
      <div className="rounded-md border border-border bg-panel p-6">
        <h2 className="font-serif text-2xl">Check your email</h2>
        <p className="mt-2 text-ink-muted">
          We sent a sign-in link to <span className="text-ink">{email}</span>. Open it on
          this device.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button onClick={onGoogle} variant="secondary" size="lg" className="w-full">
        <GoogleIcon /> Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
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
        {error ? <p className="text-sm text-measure">{error}</p> : null}
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
