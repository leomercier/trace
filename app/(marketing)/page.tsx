import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          trace
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/login" className="text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-ink px-4 py-2 text-white hover:bg-black/90"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="font-serif text-6xl leading-[1.05] tracking-tight md:text-7xl">
            Measure & annotate{" "}
            <span className="italic">drawings</span>, together.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-ink-muted">
            A free, browser-based collaborative canvas. Drop a DWG, DXF or PDF, calibrate
            scale, place measurements that snap to endpoints. Your team sees every cursor
            in real time. From the studio to the building site.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-ink px-6 py-3 text-white hover:bg-black/90"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border bg-panel px-6 py-3 hover:border-border-strong"
            >
              I already have an account
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink-faint">
            Free for everyone. No credit card.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-12 md:grid-cols-3">
          <Feature
            title="Real CAD, in the browser."
            body="DWG, DXF, PDF, SVG, PNG. Parsed client-side. WebGL keeps it smooth at 60fps even with thousands of entities."
          />
          <Feature
            title="Snap to draftsman precision."
            body="Click a known length, type the real distance. From there every measurement snaps to entity endpoints."
          />
          <Feature
            title="Cursors, live."
            body="Invite editors and viewers. Watch each other work. Share a password-protected link with anyone — no account needed to view."
          />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-faint">
          <p>© {new Date().getFullYear()} Trace</p>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="mt-3 text-ink-muted">{body}</p>
    </div>
  );
}
