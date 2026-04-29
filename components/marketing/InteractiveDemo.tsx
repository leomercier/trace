"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMousePosition";

const VERTICES = [
  { x: 80, y: 80 },
  { x: 480, y: 80 },
  { x: 480, y: 280 },
  { x: 720, y: 280 },
  { x: 720, y: 460 },
  { x: 80, y: 460 },
  { x: 280, y: 200 },
  { x: 380, y: 360 },
];

const SCALE_M_PER_PX = 0.025;

export function InteractiveDemo() {
  const ref = useRef<SVGSVGElement | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const svg = ref.current;
    if (!svg) return;
    const onMove = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 800;
      const y = ((e.clientY - rect.top) / rect.height) * 500;
      setMouse({ x, y });
    };
    const onLeave = () => setMouse(null);
    svg.addEventListener("mousemove", onMove);
    svg.addEventListener("mouseleave", onLeave);
    return () => {
      svg.removeEventListener("mousemove", onMove);
      svg.removeEventListener("mouseleave", onLeave);
    };
  }, [reduce]);

  let snap: { x: number; y: number } | null = null;
  if (mouse) {
    let best = Infinity;
    for (const v of VERTICES) {
      const dx = v.x - mouse.x;
      const dy = v.y - mouse.y;
      const d = dx * dx + dy * dy;
      if (d < best && d < 100 * 100) {
        best = d;
        snap = v;
      }
    }
  }
  const tip = snap ?? mouse;
  const anchor = VERTICES[0];
  const dist = tip
    ? Math.hypot(tip.x - anchor.x, tip.y - anchor.y) * SCALE_M_PER_PX
    : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-canvas shadow-md">
      <div className="flex items-center justify-between border-b border-border bg-panel-muted px-4 py-2 text-xs text-ink-muted">
        <span className="font-mono">measure tool · snap to vertex</span>
        <span className="font-mono tabular-nums">
          {dist != null ? `${dist.toFixed(2)} m` : "move your cursor →"}
        </span>
      </div>
      <svg
        ref={ref}
        viewBox="0 0 800 500"
        className="block aspect-[16/10] w-full cursor-crosshair"
      >
        <defs>
          <pattern id="demo-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0ebe6" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="800" height="500" fill="#ffffff" />
        <rect width="800" height="500" fill="url(#demo-grid)" />

        <g stroke="#1c1917" strokeWidth="2" fill="none" strokeLinejoin="round">
          <polyline
            points="80,80 480,80 480,280 720,280 720,460 80,460 80,80"
            fill="#fafaf9"
          />
          <line x1="280" y1="200" x2="380" y2="360" />
        </g>

        {VERTICES.map((v) => (
          <circle
            key={`${v.x}-${v.y}`}
            cx={v.x}
            cy={v.y}
            r={snap && snap.x === v.x && snap.y === v.y ? 5 : 2}
            fill={snap && snap.x === v.x && snap.y === v.y ? "#dc2626" : "#a8a29e"}
            stroke={snap && snap.x === v.x && snap.y === v.y ? "white" : "none"}
            strokeWidth="1.5"
          />
        ))}

        <circle cx={anchor.x} cy={anchor.y} r="4" fill="#dc2626" />

        {tip && (
          <g stroke="#dc2626" strokeWidth="1.5" fill="none">
            <line x1={anchor.x} y1={anchor.y} x2={tip.x} y2={tip.y} />
          </g>
        )}

        {tip && dist != null && (
          <g>
            <rect
              x={(anchor.x + tip.x) / 2 - 36}
              y={(anchor.y + tip.y) / 2 - 12}
              width="72"
              height="22"
              rx="3"
              fill="#dc2626"
            />
            <text
              x={(anchor.x + tip.x) / 2}
              y={(anchor.y + tip.y) / 2 + 3}
              textAnchor="middle"
              fontSize="13"
              fontFamily="ui-monospace, monospace"
              fill="white"
            >
              {dist.toFixed(2)} m
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
