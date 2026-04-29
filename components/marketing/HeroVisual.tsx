"use client";

import { useEffect, useRef } from "react";

export function HeroVisual() {
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const path = pathRef.current;
    if (!path || reduce) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    path.style.transition = "stroke-dashoffset 1400ms cubic-bezier(0.2, 0.7, 0.1, 1)";
    requestAnimationFrame(() => {
      path.style.strokeDashoffset = "0";
    });
  }, []);

  return (
    <svg
      viewBox="0 0 400 480"
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* Light grid */}
      <defs>
        <pattern id="hero-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000" strokeOpacity="0.06" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="400" height="480" fill="url(#hero-grid)" />

      {/* The "t" path with visible anchor points */}
      <path
        ref={pathRef}
        d="M 160 60 V 200 H 100 V 240 H 160 V 360 Q 160 420 220 420 H 320"
        fill="none"
        stroke="var(--trace-black)"
        strokeWidth="14"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Anchor markers — drawn on top */}
      {[
        [160, 60],
        [160, 200],
        [100, 200],
        [100, 240],
        [160, 240],
        [160, 360],
        [220, 420],
        [320, 420],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect
            x={x - 6}
            y={y - 6}
            width="12"
            height="12"
            fill="white"
            stroke="var(--trace-black)"
            strokeWidth="2"
          />
        </g>
      ))}

      {/* Origin label */}
      <g>
        <line
          x1="160"
          y1="60"
          x2="200"
          y2="30"
          stroke="var(--trace-black)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x="206"
          y="28"
          fontSize="11"
          fontFamily="var(--font-mono)"
          fill="var(--trace-black)"
          fillOpacity="0.7"
        >
          x: 160 · y: 60
        </text>
      </g>

      {/* Path label */}
      <g>
        <line
          x1="320"
          y1="420"
          x2="350"
          y2="450"
          stroke="var(--trace-black)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x="354"
          y="455"
          fontSize="11"
          fontFamily="var(--font-mono)"
          fill="var(--trace-black)"
          fillOpacity="0.7"
        >
          path · 8 anchors
        </text>
      </g>
    </svg>
  );
}
