import { cn } from "@/lib/utils/cn";

export function TraceLogo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      <path
        d="M164 124H348 M256 124V360 M256 360H336 M336 360V300 M336 300H286"
        stroke="currentColor"
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="164" cy="124" r="16" fill="currentColor" />
      <circle cx="256" cy="124" r="16" fill="currentColor" />
      <circle cx="348" cy="124" r="16" fill="currentColor" />
      <circle cx="256" cy="360" r="16" fill="currentColor" />
      <circle cx="336" cy="300" r="16" fill="currentColor" />
    </svg>
  );
}

export function TraceWordmark({
  className,
  logoSize = 22,
}: {
  className?: string;
  logoSize?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TraceLogo size={logoSize} />
      <span className="font-display text-[20px] font-semibold tracking-tight">
        trace
      </span>
    </span>
  );
}
