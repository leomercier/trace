import Link from "next/link";
import type { ReactNode } from "react";
import { TraceWordmark } from "@/components/marketing/TraceLogo";
import { SectionLabel } from "@/components/marketing/SectionLabel";

export function AuthShell({
  index,
  label,
  title,
  intro,
  children,
  footer,
}: {
  index: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-trace-white text-trace-black">
      <header className="border-b border-trace-black/10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4">
          <Link href="/" className="text-trace-black">
            <TraceWordmark />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="px-3 py-2 text-trace-black/70 hover:text-trace-black"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-12 px-6 py-12 md:grid-cols-[1fr_1.1fr] md:gap-20 md:py-20">
        <aside className="hidden flex-col justify-between border-r border-trace-black/10 pr-12 md:flex">
          <div>
            <SectionLabel index={index} label={label} />
            <h1 className="mt-8 font-display text-[44px] font-semibold leading-[1] tracking-tight md:text-[56px]">
              {title}
            </h1>
            {intro ? (
              <p className="mt-6 max-w-md text-lg text-trace-black/70">
                {intro}
              </p>
            ) : null}
          </div>
          {footer ? (
            <div className="mt-12 max-w-md font-mono text-xs uppercase tracking-[0.18em] text-trace-black/50">
              {footer}
            </div>
          ) : null}
        </aside>

        <section className="mx-auto w-full max-w-md md:max-w-none md:pr-6">
          <div className="md:hidden">
            <SectionLabel index={index} label={label} />
            <h1 className="mt-6 font-display text-[40px] font-semibold leading-[1.02] tracking-tight">
              {title}
            </h1>
            {intro ? (
              <p className="mt-4 text-trace-black/70">{intro}</p>
            ) : null}
          </div>
          <div className="md:mt-2">{children}</div>
        </section>
      </div>

      <FooterRule index={index} caption={`Auth · ${label}`} />
    </main>
  );
}

function FooterRule({ index, caption }: { index: string; caption: string }) {
  return (
    <div className="mx-auto flex max-w-[1280px] items-center justify-between border-t border-trace-black/10 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-trace-black/50">
      <span>{caption}</span>
      <span>{index}</span>
    </div>
  );
}
