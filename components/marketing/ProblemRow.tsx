import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function ProblemRow({
  index,
  problem,
  solutionTitle,
  solutionBody,
  reverse,
  visual,
}: {
  index: number;
  problem: string;
  solutionTitle: string;
  solutionBody: string;
  reverse?: boolean;
  visual: ReactNode;
}) {
  return (
    <div className="grid items-center gap-12 border-t border-border py-20 md:grid-cols-2 md:gap-16">
      <div className={cn(reverse ? "md:order-2" : "")}>
        <div className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Problem 0{index}
        </div>
        <h3 className="mt-3 font-serif text-3xl leading-tight text-measure md:text-4xl">
          &ldquo;{problem}&rdquo;
        </h3>
        <div className="mt-6 max-w-md">
          <h4 className="font-serif text-xl text-ink">{solutionTitle}</h4>
          <p className="mt-3 leading-relaxed text-ink-muted">{solutionBody}</p>
        </div>
      </div>
      <div className={cn("relative", reverse ? "md:order-1" : "")}>{visual}</div>
    </div>
  );
}
