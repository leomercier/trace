import { Suspense } from "react";
import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up — Trace" };
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          trace
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-col px-6 pt-16">
        <h1 className="font-serif text-4xl tracking-tight">Create your workspace</h1>
        <p className="mt-2 text-ink-muted">Free for everyone, forever.</p>
        <div className="mt-10">
          <Suspense fallback={<div className="h-40" />}>
            <SignupForm />
          </Suspense>
        </div>
        <p className="mt-8 text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-ink underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
