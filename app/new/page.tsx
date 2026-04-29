import Link from "next/link";
import { NewClient } from "./NewClient";

export const metadata = { title: "New workspace — tracable" };
export const dynamic = "force-dynamic";

/**
 * Quick-start route. Signs you in anonymously (if you don't already have a
 * session), spins up an org + project + page, mints a public share link,
 * and drops you straight into the editor. Anon workspaces auto-expire
 * after 7 days.
 *
 * Hit /new anytime, no signup needed. To keep the workspace forever, sign
 * in afterwards from the avatar menu.
 */
export default function NewPage() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-serif text-2xl">
          tracable
        </Link>
        <Link
          href="/login"
          className="text-sm text-ink-muted hover:text-ink"
        >
          Sign in
        </Link>
      </header>
      <NewClient />
    </main>
  );
}
