import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import Link from "next/link";

export const metadata = { title: "Sign in — Trace" };
export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const rawError = searchParams.error;
  const friendlyError = rawError ? friendlyAuthError(rawError) : null;
  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          trace
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-col px-6 pt-16">
        <h1 className="font-serif text-4xl tracking-tight">Welcome back</h1>
        <p className="mt-2 text-ink-muted">Sign in to your workspace.</p>
        {friendlyError ? (
          <div className="mt-6 rounded-md border border-border bg-panel p-4 text-sm">
            <p className="font-medium text-measure">{friendlyError.headline}</p>
            <p className="mt-1 text-ink-muted">{friendlyError.body}</p>
          </div>
        ) : null}
        <div className="mt-10">
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-8 text-sm text-ink-muted">
          New to Trace?{" "}
          <Link href="/signup" className="text-ink underline">
            Create an account
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function friendlyAuthError(raw: string) {
  const msg = raw.toLowerCase();
  if (msg.includes("pkce") || msg.includes("code verifier")) {
    return {
      headline: "Couldn't sign you in from that link",
      body:
        "The link must be opened in the same browser where you requested it. Send a fresh link below and click it from this browser, or scan the QR if you switch devices.",
    };
  }
  if (msg.includes("expired")) {
    return {
      headline: "That link has expired",
      body: "Magic links are valid for one hour. Request a new one below.",
    };
  }
  return { headline: "Sign-in error", body: raw };
}
