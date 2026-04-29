"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMousePosition";

export function HeroCanvas() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      target = {
        x: (e.clientX - cx) / rect.width,
        y: (e.clientY - cy) / rect.height,
      };
    };

    const tick = () => {
      const wrap = wrapRef.current;
      if (wrap) {
        cur.x += (target.x - cur.x) * 0.08;
        cur.y += (target.y - cur.y) * 0.08;
        const ry = cur.x * 4;
        const rx = -cur.y * 4;
        wrap.style.transform = `perspective(1400px) rotateX(${rx.toFixed(
          2,
        )}deg) rotateY(${ry.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <div className="relative">
      <div
        ref={wrapRef}
        className="relative w-full origin-center will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <BrowserFrame />
      </div>
    </div>
  );
}

function BrowserFrame() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-border bg-panel-muted px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#fb7185]" />
        <span className="size-2.5 rounded-full bg-[#fbbf24]" />
        <span className="size-2.5 rounded-full bg-[#34d399]" />
        <span className="ml-3 truncate text-xs text-ink-faint">
          trace.app / studio / floor-plan-2nd
        </span>
      </div>
      <div className="relative aspect-[16/10] w-full">
        <DrawingMock />
      </div>
    </div>
  );
}

function DrawingMock() {
  return (
    <svg viewBox="0 0 800 500" className="h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="#eeeae6"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="800" height="500" fill="#ffffff" />
      <rect width="800" height="500" fill="url(#grid)" />

      <g stroke="#1c1917" strokeWidth="2" fill="none" strokeLinejoin="round">
        <rect x="120" y="100" width="560" height="320" />
        <line x1="120" y1="220" x2="420" y2="220" />
        <line x1="420" y1="100" x2="420" y2="320" />
        <line x1="420" y1="320" x2="680" y2="320" />
        <rect x="160" y="140" width="100" height="60" />
        <rect x="280" y="140" width="120" height="60" />
        <rect x="460" y="140" width="200" height="120" />
        <rect x="460" y="280" width="80" height="120" />
        <rect x="560" y="280" width="100" height="120" />
        <line x1="200" y1="220" x2="200" y2="320" strokeDasharray="4 4" />
        <line x1="320" y1="220" x2="320" y2="320" strokeDasharray="4 4" />
      </g>

      <g stroke="#dc2626" strokeWidth="1.5" fill="#dc2626">
        <line x1="120" y1="455" x2="420" y2="455" />
        <line x1="120" y1="447" x2="120" y2="463" />
        <line x1="420" y1="447" x2="420" y2="463" />
        <text x="270" y="448" textAnchor="middle" fontSize="13" fontFamily="ui-monospace, monospace" fill="#dc2626">
          12.40 m
        </text>
      </g>

      <g stroke="#dc2626" strokeWidth="1.5" fill="#dc2626">
        <line x1="700" y1="100" x2="700" y2="320" />
        <line x1="692" y1="100" x2="708" y2="100" />
        <line x1="692" y1="320" x2="708" y2="320" />
        <text x="715" y="214" fontSize="13" fontFamily="ui-monospace, monospace" fill="#dc2626">
          7.85 m
        </text>
      </g>

      <g>
        <rect x="470" y="155" width="140" height="44" rx="4" fill="#fef3c7" stroke="#fcd34d" />
        <text x="478" y="172" fontSize="12" fontFamily="Caveat, cursive" fill="#1c1917">
          Confirm beam depth
        </text>
        <text x="478" y="190" fontSize="11" fontFamily="Caveat, cursive" fill="#78716c">
          — Aida, today
        </text>
      </g>

      <g>
        <circle cx="320" cy="240" r="4" fill="var(--cursor-1, #2563eb)" />
        <circle cx="320" cy="240" r="9" fill="var(--cursor-1, #2563eb)" fillOpacity="0.18" />
      </g>
    </svg>
  );
}
