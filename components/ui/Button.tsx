"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-ink text-white hover:bg-black/90 disabled:bg-ink-faint disabled:text-white",
  secondary:
    "bg-panel border border-border text-ink hover:border-border-strong disabled:text-ink-faint",
  ghost: "bg-transparent text-ink hover:bg-panel-muted",
  danger: "bg-measure text-white hover:bg-red-700",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed",
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}
