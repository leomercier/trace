"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-border bg-panel px-3 text-sm text-ink placeholder:text-ink-faint",
      "focus:border-ink focus:outline-none",
      "disabled:bg-panel-muted disabled:text-ink-faint",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint",
      "focus:border-ink focus:outline-none",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted", className)}>
      {children}
    </label>
  );
}
