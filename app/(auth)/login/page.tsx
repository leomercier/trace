import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import Link from "next/link";

export const metadata = { title: "Sign in — Trace" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
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
