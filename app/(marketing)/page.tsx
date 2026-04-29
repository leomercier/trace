import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { LiveCursors } from "@/components/marketing/LiveCursors";
import { MeasurementTrail } from "@/components/marketing/MeasurementTrail";
import { HeroCanvas } from "@/components/marketing/HeroCanvas";
import { ProblemRow } from "@/components/marketing/ProblemRow";
import { HostingTriad } from "@/components/marketing/HostingTriad";
import { InteractiveDemo } from "@/components/marketing/InteractiveDemo";
import { StatusPill } from "@/components/marketing/StatusPill";
import {
  MarkupVisual,
  CalibrateVisual,
  FieldVisual,
  OssVisual,
  PresenceVisual,
} from "@/components/marketing/ProblemVisuals";

const GITHUB_URL = "https://github.com/leomercier/trace";

export default function Landing() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <MeasurementTrail />

      <Header />

      <Hero />

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6">
          <ProblemRow
            index={1}
            problem="Markup feedback dies in email."
            solutionTitle="Live cursors. Anchored notes. Everyone, at once."
            solutionBody="See every collaborator's cursor and annotation as it happens. Notes pin to the drawing, not to a thread. The site team and the studio finally see the same thing at the same time."
            visual={<PresenceVisual />}
          />
          <ProblemRow
            index={2}
            problem="PDFs lie about scale."
            solutionTitle="Calibrate once. Snap forever."
            solutionBody="Click a known length, type the real distance. From there every measurement snaps to entity endpoints — to the millimeter. Works on DWG, DXF, PDF, SVG and raster."
            reverse
            visual={<CalibrateVisual />}
          />
          <ProblemRow
            index={3}
            problem="Your CAD file won't open on site."
            solutionTitle="Browser-native. Tablet-ready. Share with a link."
            solutionBody="DWG, DXF, PDF, SVG, PNG — parsed client-side, rendered with WebGL at 60fps. Password-protected share links work without a signup. The contractor just clicks."
            visual={<FieldVisual />}
          />
          <ProblemRow
            index={4}
            problem="Tools you don't own end up owning you."
            solutionTitle="Open source. MIT. Self-hostable."
            solutionBody="The full source is on GitHub. Run our hosted version, or clone the repo and deploy on your own infra. No telemetry, no lock-in, no surprise paywall."
            reverse
            visual={<OssVisual />}
          />
          <ProblemRow
            index={5}
            problem="The drawing is in three places at once."
            solutionTitle="One canvas. Every viewer in sync."
            solutionBody="Versions, layers, attachments — all live in one room. When you change the drawing, the contractor's tablet updates. When they leave a note, you see it the moment it lands."
            visual={<MarkupVisual />}
          />
        </div>
      </section>

      <TryItHere />

      <HostingTriad />

      <FinalCta />

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          trace
        </Link>
        <nav className="flex items-center gap-1 text-sm md:gap-3">
          <Link
            href="#problems"
            className="hidden px-3 py-2 text-ink-muted hover:text-ink md:inline"
          >
            How it works
          </Link>
          <Link
            href="#hosting"
            className="hidden px-3 py-2 text-ink-muted hover:text-ink md:inline"
          >
            Self-host
          </Link>
          <Link
            href={GITHUB_URL}
            className="hidden items-center gap-1.5 px-3 py-2 text-ink-muted hover:text-ink md:inline-flex"
          >
            <Github className="size-4" />
            GitHub
          </Link>
          <Link
            href="/login"
            className="px-3 py-2 text-ink-muted hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-ink px-4 py-2 text-white hover:bg-black/90"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GridBackground />
      <div className="absolute inset-0 hidden md:block">
        <LiveCursors />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2">
            <StatusPill label="Open source" dotClass="bg-cursor-3" />
            <StatusPill label="Self-host or hosted" dotClass="bg-cursor-1" />
            <StatusPill label="Free forever" dotClass="bg-measure" />
          </div>

          <h1 className="mt-6 font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
            Measure. Annotate.{" "}
            <span className="italic">Trace, together.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            The browser-native canvas for architectural and construction
            drawings. Drop a DWG, DXF or PDF. Calibrate scale. Place
            measurements that snap to endpoints. Your team sees every cursor in
            real time — from the studio to the building site.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-6 text-white hover:bg-black/90"
            >
              Try it free
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              href={GITHUB_URL}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-panel px-6 hover:border-border-strong"
            >
              <Github className="size-4" />
              Star on GitHub
            </Link>
            <Link
              href="#try-it"
              className="inline-flex h-12 items-center justify-center px-2 text-sm text-ink-muted hover:text-ink"
            >
              See it in 30s &rarr;
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink-faint">
            MIT licensed. No credit card. No lock-in.
          </p>
        </div>

        <div className="relative z-10">
          <HeroCanvas />
        </div>
      </div>

      <div id="problems" />
    </section>
  );
}

function GridBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--border) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        maskImage:
          "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
      }}
    />
  );
}

function TryItHere() {
  return (
    <section id="try-it" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            Try it here
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
            Move your cursor.{" "}
            <span className="italic text-ink-muted">Watch it snap.</span>
          </h2>
          <p className="mt-4 text-ink-muted">
            This is what placing a measurement in Trace feels like — vertices
            attract, distance updates as you go, and the label sticks. Now
            imagine your team doing this together.
          </p>
        </div>
        <InteractiveDemo />
        <div className="mt-6 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink hover:underline"
          >
            Open the real editor &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-serif text-5xl leading-tight md:text-6xl">
          Pick your path.{" "}
          <span className="italic text-ink-muted">Both are free.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-ink-muted">
          Sign up and start in 30 seconds, or clone the source and run it on
          your own infrastructure. Same product, your choice of who hosts it.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-6 text-white hover:bg-black/90"
          >
            Start on hosted
            <ArrowRight className="ml-2 size-4" />
          </Link>
          <Link
            href={GITHUB_URL}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-panel px-6 hover:border-border-strong"
          >
            <Github className="size-4" />
            Self-host on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-ink-faint">
        <p>© {new Date().getFullYear()} Trace · MIT licensed</p>
        <div className="flex items-center gap-5">
          <Link href={GITHUB_URL} className="hover:text-ink">
            GitHub
          </Link>
          <Link href="#hosting" className="hover:text-ink">
            Self-host
          </Link>
          <Link href="/login" className="hover:text-ink">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
