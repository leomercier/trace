import Link from "next/link";
import { Cloud, Server } from "lucide-react";

export function HostingTriad() {
  return (
    <section id="hosting" className="border-t border-border bg-panel-muted">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            Hosted or yours
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
            Two ways to run Trace.{" "}
            <span className="italic text-ink-muted">Both free.</span>
          </h2>
          <p className="mt-4 text-ink-muted">
            Use our hosted version, or clone the repo and run your own. Same
            features. No paywall in between.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-panel p-8">
            <div className="flex items-center gap-3">
              <Cloud className="size-5 text-ink-muted" />
              <h3 className="font-serif text-2xl">Hosted</h3>
            </div>
            <p className="mt-3 text-ink-muted">
              Magic-link signup. You&apos;re measuring drawings in 30 seconds.
              Free for everyone, no credit card.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-muted">
              <li className="flex gap-2">
                <span className="text-ink">&bull;</span> Realtime cursors &amp;
                presence
              </li>
              <li className="flex gap-2">
                <span className="text-ink">&bull;</span> Password-protected
                public share links
              </li>
              <li className="flex gap-2">
                <span className="text-ink">&bull;</span> Updates ship the
                moment they&apos;re ready
              </li>
            </ul>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-white hover:bg-black/90"
            >
              Start on hosted &rarr;
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-panel p-8">
            <div className="flex items-center gap-3">
              <Server className="size-5 text-ink-muted" />
              <h3 className="font-serif text-2xl">Self-host</h3>
            </div>
            <p className="mt-3 text-ink-muted">
              Clone the repo. Point it at your own Supabase + Vercel (or any
              Node host). Your data stays on your infra.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-md border border-border bg-bg px-4 py-3 font-mono text-xs leading-relaxed text-ink">
{`git clone https://github.com/leomercier/trace
cd trace && bun install
bun run migrate && bun run dev`}
            </pre>
            <Link
              href="https://github.com/leomercier/trace"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-md border border-border bg-bg px-5 text-sm font-medium text-ink hover:border-border-strong"
            >
              View source on GitHub &rarr;
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-ink-faint">
          MIT licensed. No telemetry. No vendor lock-in.
        </p>
      </div>
    </section>
  );
}
