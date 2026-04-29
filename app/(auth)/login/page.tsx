import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { AuthShell } from "@/components/marketing/AuthShell";

export const metadata = { title: "Sign in — tracable" };
export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const rawError = searchParams.error;
  const friendlyError = rawError ? friendlyAuthError(rawError) : null;

  return (
    <AuthShell
      index="01"
      label="Sign in"
      title={
        <>
          Welcome
          <br />
          back.
        </>
      }
      intro="Sign in to your workspace. Magic link or Google — your call."
      footer={<>Open source · Self-host or hosted</>}
    >
      {friendlyError ? (
        <div className="mb-6 rounded-md border border-trace-error/40 bg-trace-error/5 p-4 text-sm">
          <p className="font-medium text-trace-error">
            {friendlyError.headline}
          </p>
          <p className="mt-1 text-trace-black/70">{friendlyError.body}</p>
        </div>
      ) : null}

      <Suspense fallback={<div className="h-40" />}>
        <LoginForm />
      </Suspense>

      <p className="mt-8 text-sm text-trace-black/70">
        New to tracable?{" "}
        <Link
          href="/signup"
          className="font-medium text-trace-black underline underline-offset-4 decoration-trace-black/40 hover:decoration-trace-black"
        >
          Create an account
        </Link>
        .
      </p>
    </AuthShell>
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
