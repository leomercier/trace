import { cn } from "@/lib/utils/cn";

export function TraceLogo({
  className,
  showAnchors = false,
  size = 28,
}: {
  className?: string;
  showAnchors?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      <path
        d="M11 4 V12 H6 V16 H11 V24 Q11 28 15 28 H22"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      {showAnchors && (
        <g>
          <Anchor x={11} y={4} />
          <Anchor x={11} y={12} />
          <Anchor x={6} y={16} />
          <Anchor x={11} y={16} />
          <Anchor x={11} y={24} />
          <Anchor x={22} y={28} />
        </g>
      )}
    </svg>
  );
}

function Anchor({ x, y }: { x: number; y: number }) {
  return (
    <rect
      x={x - 1.6}
      y={y - 1.6}
      width="3.2"
      height="3.2"
      fill="white"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  );
}

export function TraceWordmark({
  className,
  showAnchors = false,
}: {
  className?: string;
  showAnchors?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TraceLogo size={22} showAnchors={showAnchors} />
      <span className="font-display text-[20px] font-semibold tracking-tight">
        trace
      </span>
    </span>
  );
}
