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
    path.style.transition =
      "stroke-dashoffset 1400ms cubic-bezier(0.2, 0.7, 0.1, 1)";
    requestAnimationFrame(() => {
      path.style.strokeDashoffset = "0";
    });
  }, []);

  return (
    <svg
      viewBox="0 0 512 560"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="hero-grid"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="var(--trace-black)"
            strokeOpacity="0.06"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="512" height="560" fill="url(#hero-grid)" />

      {/* The canonical t-mark: scaled-up logo path */}
      <path
        ref={pathRef}
        d="M164 124H348 M256 124V360 M256 360H336 M336 360V300 M336 300H286"
        fill="none"
        stroke="var(--trace-black)"
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {[
        [164, 124],
        [256, 124],
        [348, 124],
        [256, 360],
        [336, 300],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="16"
          fill="var(--trace-black)"
        />
      ))}

      {/* Origin anchor callout */}
      <g>
        <line
          x1="164"
          y1="124"
          x2="120"
          y2="68"
          stroke="var(--trace-black)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x="40"
          y="56"
          fontSize="14"
          fontFamily="var(--font-mono)"
          fill="var(--trace-black)"
          fillOpacity="0.7"
        >
          anchor 01 · 164,124
        </text>
      </g>

      {/* Foot anchor callout */}
      <g>
        <line
          x1="336"
          y1="300"
          x2="420"
          y2="300"
          stroke="var(--trace-black)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x="430"
          y="304"
          fontSize="14"
          fontFamily="var(--font-mono)"
          fill="var(--trace-black)"
          fillOpacity="0.7"
        >
          05
        </text>
      </g>

      {/* Path label */}
      <g>
        <line
          x1="256"
          y1="360"
          x2="200"
          y2="450"
          stroke="var(--trace-black)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x="40"
          y="470"
          fontSize="14"
          fontFamily="var(--font-mono)"
          fill="var(--trace-black)"
          fillOpacity="0.7"
        >
          path · 5 anchors · stroke 44
        </text>
      </g>
    </svg>
  );
}
