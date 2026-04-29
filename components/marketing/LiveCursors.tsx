"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMousePosition";

type Ghost = {
  name: string;
  color: string;
  path: { x: number; y: number }[];
  speed: number;
  phase: number;
};

const GHOSTS: Ghost[] = [
  {
    name: "Aida",
    color: "var(--cursor-1)",
    path: [
      { x: 0.12, y: 0.2 },
      { x: 0.42, y: 0.36 },
      { x: 0.6, y: 0.18 },
      { x: 0.86, y: 0.32 },
      { x: 0.7, y: 0.62 },
      { x: 0.32, y: 0.5 },
    ],
    speed: 0.00006,
    phase: 0,
  },
  {
    name: "Marco",
    color: "var(--cursor-2)",
    path: [
      { x: 0.78, y: 0.78 },
      { x: 0.58, y: 0.86 },
      { x: 0.22, y: 0.7 },
      { x: 0.16, y: 0.42 },
      { x: 0.5, y: 0.58 },
      { x: 0.82, y: 0.5 },
    ],
    speed: 0.00005,
    phase: 0.33,
  },
  {
    name: "Léo",
    color: "var(--cursor-3)",
    path: [
      { x: 0.5, y: 0.12 },
      { x: 0.74, y: 0.28 },
      { x: 0.62, y: 0.54 },
      { x: 0.34, y: 0.66 },
      { x: 0.18, y: 0.84 },
      { x: 0.46, y: 0.78 },
    ],
    speed: 0.00007,
    phase: 0.66,
  },
];

type Pos = { x: number; y: number };

function sampleLoop(path: Pos[], t: number): Pos {
  const n = path.length;
  const u = ((t % 1) + 1) % 1;
  const f = u * n;
  const i = Math.floor(f);
  const k = f - i;
  const a = path[i];
  const b = path[(i + 1) % n];
  const c = path[(i + 2) % n];
  const e = 0.5 * (1 - Math.cos(Math.PI * k));
  const x1 = a.x + (b.x - a.x) * e;
  const y1 = a.y + (b.y - a.y) * e;
  const x2 = b.x + (c.x - b.x) * e;
  const y2 = b.y + (c.y - b.y) * e;
  return { x: x1 + (x2 - x1) * 0.5 * k, y: y1 + (y2 - y1) * 0.5 * k };
}

export function LiveCursors({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cursorsRef = useRef<Array<HTMLDivElement | null>>([]);
  const reduce = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const el = containerRef.current;
      if (!el) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const { width, height } = el.getBoundingClientRect();
      const dt = now - start;
      GHOSTS.forEach((g, i) => {
        const t = g.phase + dt * g.speed;
        const p = sampleLoop(g.path, t);
        const node = cursorsRef.current[i];
        if (node) {
          node.style.transform = `translate3d(${p.x * width}px, ${p.y * height}px, 0)`;
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted, reduce]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {GHOSTS.map((g, i) => (
        <div
          key={g.name}
          ref={(el) => {
            cursorsRef.current[i] = el;
          }}
          className="absolute left-0 top-0 will-change-transform"
          style={{ transition: reduce ? "none" : "transform 60ms linear" }}
        >
          <Cursor color={g.color} name={g.name} />
        </div>
      ))}
    </div>
  );
}

function Cursor({ color, name }: { color: string; name: string }) {
  return (
    <div className="relative -translate-x-1 -translate-y-1">
      <svg width="20" height="22" viewBox="0 0 20 22" className="drop-shadow-sm">
        <path
          d="M2 2 L2 17 L7 13 L10 19 L13 18 L10 12 L17 12 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute left-4 top-4 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}
