"use client";

import { cn } from "@/lib/utils/cn";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArtboardToolIcon } from "@hugeicons/core-free-icons";

/**
 * Brand mark — the Hugeicons "Artboard tool" glyph. Pairs with the
 * tracable wordmark; a one-character CAD-tool affordance that reads at
 * any size.
 */
export function TraceLogo({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <HugeiconsIcon
      icon={ArtboardToolIcon}
      size={size}
      strokeWidth={1.5}
      className={cn("inline-block", className)}
      aria-hidden="true"
    />
  );
}

/**
 * Logomark + "tracable" wordmark. The wordmark is rendered in Geist Sans
 * (the project's body face) at semibold to match the system without
 * pulling in a separate display font.
 */
export function TraceWordmark({
  className,
  logoSize = 20,
}: {
  className?: string;
  logoSize?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TraceLogo size={logoSize} />
      <span className="font-sans text-[20px] font-semibold tracking-tight">
        tracable
      </span>
    </span>
  );
}
