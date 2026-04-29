import { Suspense } from "react";
import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { AuthShell } from "@/components/marketing/AuthShell";

export const metadata = { title: "Sign up — trace" };
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <AuthShell
      index="02"
      label="Create workspace"
      title={
        <>
          Build with
          <br />
          full visibility.
        </>
      }
      intro="Create a workspace and invite your team. Free for everyone, forever."
      footer={<>MIT licensed · Self-host or hosted · No credit card</>}
    >
      <Suspense fallback={<div className="h-40" />}>
        <SignupForm />
      </Suspense>

      <p className="mt-8 text-sm text-trace-black/70">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-trace-black underline underline-offset-4 decoration-trace-black/40 hover:decoration-trace-black"
        >
          Sign in
        </Link>
        .
      </p>
    </AuthShell>
  );
}
