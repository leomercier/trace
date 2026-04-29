import { cn } from "@/lib/utils/cn";

export function StatusPill({
  label,
  dotClass,
  className,
}: {
  label: string;
  dotClass?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-ink-muted",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full bg-ink", dotClass)} />
      {label}
    </span>
  );
}
