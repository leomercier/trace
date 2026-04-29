import { cn } from "@/lib/utils/cn";

export function SectionLabel({
  index,
  label,
  tone = "dark",
  className,
}: {
  index: string;
  label: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em]",
        tone === "dark" ? "text-trace-black/70" : "text-trace-white/70",
        className,
      )}
    >
      <span className="font-medium">{index}</span>
      <span className="h-px w-8 bg-current opacity-40" />
      <span>{label}</span>
    </div>
  );
}
