import Link from "next/link";
import { ArrowRight, Github, Download } from "lucide-react";
import { TraceLogo, TraceWordmark } from "@/components/marketing/TraceLogo";
import { SectionLabel } from "@/components/marketing/SectionLabel";
import { HeroVisual } from "@/components/marketing/HeroVisual";
import { PathDiagram } from "@/components/marketing/PathDiagram";
import { ComponentPanel } from "@/components/marketing/ComponentPanel";
import { GraphicLanguage } from "@/components/marketing/GraphicLanguage";
import { PrinciplesGrid } from "@/components/marketing/PrinciplesGrid";

const GITHUB_URL = "https://github.com/leomercier/trace";

export default function Landing() {
  return (
    <main className="min-h-screen bg-trace-white text-trace-black">
      <Header />
      <SectionWhite />
      <SectionOrange />
      <SectionViolet />
      <SectionPink />
      <SectionPlum />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-trace-black/10 bg-trace-white">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4">
        <Link href="/" className="text-trace-black">
          <TraceWordmark />
        </Link>
        <nav className="flex items-center gap-1 text-sm md:gap-3">
          <Link
            href="#system"
            className="hidden px-3 py-2 text-trace-black/70 hover:text-trace-black md:inline"
          >
            System
          </Link>
          <Link
            href="#components"
            className="hidden px-3 py-2 text-trace-black/70 hover:text-trace-black md:inline"
          >
            Components
          </Link>
          <Link
            href="#principles"
            className="hidden px-3 py-2 text-trace-black/70 hover:text-trace-black md:inline"
          >
            Principles
          </Link>
          <Link
            href={GITHUB_URL}
            className="hidden items-center gap-1.5 px-3 py-2 text-trace-black/70 hover:text-trace-black md:inline-flex"
          >
            <Github className="size-4" />
            GitHub
          </Link>
          <Link
            href="/login"
            className="px-3 py-2 text-trace-black/70 hover:text-trace-black"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-trace-black px-4 py-2 text-trace-white hover:opacity-90"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------- 01 — White ---------- */

function SectionWhite() {
  return (
    <section
      id="system"
      className="relative border-b border-trace-black/10 bg-trace-white text-trace-black"
    >
      <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-24 md:grid-cols-[1.2fr_1fr] md:py-32 lg:gap-20">
        <div>
          <SectionLabel index="01" label="Open source" />
          <h1 className="mt-8 font-display text-[56px] font-semibold leading-[0.95] tracking-tight md:text-[88px]">
            Design with
            <br />
            full visibility.
          </h1>
          <p className="mt-8 max-w-md text-lg text-trace-black/70">
            trace is the open source design and prototyping tool that exposes
            structure and logic, so teams can build better products.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-trace-black px-6 text-trace-white hover:opacity-90"
            >
              <Download className="mr-2 size-4" />
              Download
            </Link>
            <Link
              href={GITHUB_URL}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-trace-black/20 bg-trace-white px-6 text-trace-black hover:border-trace-black"
            >
              <Github className="size-4" />
              View on GitHub
            </Link>
          </div>

          <dl className="mt-16 grid max-w-md grid-cols-3 gap-px border-y border-trace-black/10">
            <Stat label="License" value="MIT" />
            <Stat label="Hosting" value="Self or us" />
            <Stat label="Price" value="Free" />
          </dl>
        </div>

        <div className="relative aspect-square min-h-[320px] md:aspect-auto">
          <HeroVisual />
        </div>
      </div>

      <FootRule index="01" caption="trace · Brand Kit v1.0" />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-trace-black/10 px-4 py-4 last:border-r-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-trace-black/50">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-semibold text-trace-black">
        {value}
      </dd>
    </div>
  );
}

/* ---------- 02 — Orange ---------- */

function SectionOrange() {
  return (
    <section
      id="inspectability"
      className="relative bg-trace-orange text-trace-white"
    >
      <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-24 md:grid-cols-2 md:py-32 lg:gap-20">
        <div>
          <SectionLabel index="02" label="Inspectability" tone="light" />
          <h2 className="mt-8 font-display text-[48px] font-semibold leading-[0.98] tracking-tight md:text-[72px]">
            See every
            <br />
            decision.
          </h2>
          <p className="mt-8 max-w-md text-lg text-trace-white/80">
            trace makes the structure behind your product explicit, so you can
            design, understand, and ship with confidence. Every component,
            every token, every connection — visible.
          </p>

          <ul className="mt-10 grid max-w-md gap-3 font-mono text-sm">
            {[
              "Every layer is named",
              "Every value is a token",
              "Every change is traceable",
            ].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-trace-white" />
                <span className="text-trace-white/85">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative min-h-[320px]">
          <PathDiagram />
        </div>
      </div>

      <FootRule index="02" caption="System · Connections" tone="light" />
    </section>
  );
}

/* ---------- 03 — Violet ---------- */

function SectionViolet() {
  return (
    <section
      id="components"
      className="relative bg-trace-violet text-trace-white"
    >
      <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-24 md:grid-cols-[1.2fr_1fr] md:py-32 lg:gap-20">
        <div>
          <SectionLabel index="03" label="Systems" tone="light" />
          <h2 className="mt-8 font-display text-[48px] font-semibold leading-[0.98] tracking-tight md:text-[72px]">
            Build systems,
            <br />
            not screens.
          </h2>
          <p className="mt-8 max-w-md text-lg text-trace-white/80">
            Create reusable components, manage variables, and keep everything
            in sync across your product. One source of truth — for design and
            for code.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-md border border-white/15">
            {[
              ["Components", "Versioned, typed"],
              ["Variables", "Tokens you can ship"],
              ["Frames", "Composed, not painted"],
              ["States", "Default, hover, active"],
            ].map(([title, body]) => (
              <div key={title} className="bg-white/5 p-4">
                <div className="font-display text-base font-semibold text-trace-white">
                  {title}
                </div>
                <div className="mt-1 text-xs text-trace-white/70">{body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <ComponentPanel />
        </div>
      </div>

      <FootRule index="03" caption="System · Components" tone="light" />
    </section>
  );
}

/* ---------- 04 — Pink ---------- */

function SectionPink() {
  return (
    <section
      id="open-source"
      className="relative bg-trace-pink text-trace-black"
    >
      <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-24 md:grid-cols-[1.1fr_1fr] md:py-32 lg:gap-20">
        <div>
          <SectionLabel index="04" label="Open by design" />
          <h2 className="mt-8 font-display text-[48px] font-semibold leading-[0.98] tracking-tight md:text-[80px]">
            Design systems
            <br />
            you can trace.
          </h2>
          <p className="mt-8 max-w-md text-lg text-trace-black/80">
            Open source design and prototyping for teams who care about
            clarity. Run our hosted version, or clone the repo and deploy it
            on your own infrastructure.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-trace-black px-6 text-trace-white hover:opacity-90"
            >
              <Download className="mr-2 size-4" />
              Download
            </Link>
            <Link
              href={GITHUB_URL}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-trace-black/30 bg-transparent px-6 text-trace-black hover:bg-trace-black hover:text-trace-pink"
            >
              <Github className="size-4" />
              Explore source
            </Link>
            <Link
              href="#hosting"
              className="inline-flex h-12 items-center justify-center px-2 text-sm text-trace-black/70 hover:text-trace-black"
            >
              Self-host options →
            </Link>
          </div>
        </div>

        <div id="hosting" className="grid gap-4">
          <HostCard
            title="Hosted"
            body="Sign up and start in 30 seconds. Free."
            cta="Start on hosted"
            href="/signup"
            primary
          />
          <HostCard
            title="Self-host"
            body="Clone the repo. Point at your own Supabase + Vercel. Your data, your servers."
            cta="git clone trace"
            href={GITHUB_URL}
          />
        </div>
      </div>

      <FootRule index="04" caption="Brand in Action · Digital" />
    </section>
  );
}

function HostCard({
  title,
  body,
  cta,
  href,
  primary,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-md border p-6 transition-colors ${
        primary
          ? "border-trace-black bg-trace-black text-trace-pink hover:opacity-90"
          : "border-trace-black/20 bg-trace-white text-trace-black hover:border-trace-black"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="font-display text-2xl font-semibold">{title}</div>
        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
      </div>
      <p
        className={`mt-2 text-sm ${
          primary ? "text-trace-pink/80" : "text-trace-black/70"
        }`}
      >
        {body}
      </p>
      <div
        className={`mt-4 inline-flex font-mono text-xs ${
          primary ? "text-trace-pink/80" : "text-trace-black/60"
        }`}
      >
        {cta}
      </div>
    </Link>
  );
}

/* ---------- 05 — Plum ---------- */

function SectionPlum() {
  return (
    <section
      id="principles"
      className="relative bg-trace-plum text-trace-white"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <SectionLabel index="05" label="Principles" tone="light" />
            <h2 className="mt-8 font-display text-[48px] font-semibold leading-[0.98] tracking-tight md:text-[64px]">
              Structure
              <br />
              <span className="text-trace-pink">+</span>
              <br />
              Expression.
            </h2>
            <p className="mt-8 max-w-md text-lg text-trace-white/70">
              Hold the tension between system and surface. If one dominates,
              the work fails.
            </p>
          </div>
          <PrinciplesGrid />
        </div>

        <div id="graphic-language" className="mt-24">
          <SectionLabel index="06" label="Graphic language" tone="light" />
          <h3 className="mt-6 max-w-3xl font-display text-[36px] font-semibold leading-[1] tracking-tight md:text-[56px]">
            Paths, nodes, layers, fragments.
          </h3>
          <p className="mt-4 max-w-xl text-trace-white/70">
            Four primitives. Every visual in trace is built from them — never
            decoration for its own sake.
          </p>
          <div className="mt-10">
            <GraphicLanguage />
          </div>
        </div>

        <div className="mt-24 flex flex-wrap items-center justify-between gap-6 rounded-md border border-white/15 bg-white/5 p-8">
          <div>
            <div className="font-display text-2xl font-semibold text-trace-white md:text-3xl">
              See every decision.
            </div>
            <p className="mt-1 text-trace-white/70">
              Open the editor or read the source. Both are free.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-trace-lime px-6 font-medium text-trace-black hover:opacity-90"
            >
              Start on hosted
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              href={GITHUB_URL}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/30 px-6 text-trace-white hover:border-white"
            >
              <Github className="size-4" />
              GitHub
            </Link>
          </div>
        </div>
      </div>

      <FootRule index="05" caption="Brand · Principles" tone="light" />
    </section>
  );
}

/* ---------- shared bits ---------- */

function FootRule({
  index,
  caption,
  tone = "dark",
}: {
  index: string;
  caption: string;
  tone?: "dark" | "light";
}) {
  const color =
    tone === "dark" ? "text-trace-black/60" : "text-trace-white/60";
  return (
    <div
      className={`mx-auto flex max-w-[1280px] items-center justify-between border-t px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] ${color} ${
        tone === "dark" ? "border-trace-black/10" : "border-white/15"
      }`}
    >
      <span>{caption}</span>
      <span>{index}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-trace-black/10 bg-trace-white">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <TraceWordmark />
          <p className="mt-3 max-w-xs text-sm text-trace-black/60">
            Open source design and prototyping. MIT licensed.
          </p>
        </div>
        <FooterCol
          heading="Product"
          links={[
            ["Download", "/signup"],
            ["Sign in", "/login"],
            ["GitHub", GITHUB_URL],
          ]}
        />
        <FooterCol
          heading="System"
          links={[
            ["Inspectability", "#inspectability"],
            ["Components", "#components"],
            ["Principles", "#principles"],
          ]}
        />
        <FooterCol
          heading="Open source"
          links={[
            ["License (MIT)", GITHUB_URL],
            ["Self-host guide", GITHUB_URL],
            ["Issues", `${GITHUB_URL}/issues`],
          ]}
        />
      </div>
      <div className="border-t border-trace-black/10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-trace-black/50">
          <span>© {new Date().getFullYear()} trace · MIT</span>
          <TraceLogo size={16} />
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: [string, string][];
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-trace-black/50">
        {heading}
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-trace-black/80 hover:text-trace-black"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
