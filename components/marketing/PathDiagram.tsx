"use client";

import { useEffect, useRef, useState } from "react";

type Node = { id: string; label: string; x: number; y: number; w: number };
type Edge = { from: string; to: string };

const NODES: Node[] = [
  { id: "btn", label: "Button / Primary", x: 60, y: 40, w: 168 },
  { id: "comp", label: "Component", x: 320, y: 130, w: 130 },
  { id: "frame", label: "Frame", x: 60, y: 230, w: 100 },
  { id: "tokens", label: "Tokens", x: 320, y: 290, w: 110 },
];

const EDGES: Edge[] = [
  { from: "btn", to: "comp" },
  { from: "frame", to: "comp" },
  { from: "tokens", to: "comp" },
];

const NODE_H = 38;

export function PathDiagram() {
  const ref = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const onLeave = () => setHovered(null);
    svg.addEventListener("mouseleave", onLeave);
    return () => svg.removeEventListener("mouseleave", onLeave);
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 500 360"
      className="block h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <pattern id="dotgrid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="white" fillOpacity="0.18" />
        </pattern>
      </defs>
      <rect width="500" height="360" fill="url(#dotgrid)" />

      {EDGES.map((e) => {
        const a = NODES.find((n) => n.id === e.from)!;
        const b = NODES.find((n) => n.id === e.to)!;
        const ax = a.x + a.w;
        const ay = a.y + NODE_H / 2;
        const bx = b.x;
        const by = b.y + NODE_H / 2;
        const cx = (ax + bx) / 2;
        const isActive = hovered === e.from || hovered === e.to;
        return (
          <g key={`${e.from}-${e.to}`}>
            <path
              d={`M ${ax} ${ay} C ${cx} ${ay}, ${cx} ${by}, ${bx} ${by}`}
              fill="none"
              stroke="white"
              strokeOpacity={isActive ? 1 : 0.55}
              strokeWidth={isActive ? 2 : 1.4}
            />
            <circle cx={ax} cy={ay} r="3" fill="white" />
            <circle cx={bx} cy={by} r="3" fill="white" />
          </g>
        );
      })}

      {NODES.map((n) => {
        const isHover = hovered === n.id;
        return (
          <g
            key={n.id}
            transform={`translate(${n.x},${n.y})`}
            onMouseEnter={() => setHovered(n.id)}
            style={{ cursor: "pointer" }}
          >
            <rect
              width={n.w}
              height={NODE_H}
              rx="6"
              fill={isHover ? "white" : "rgba(255,255,255,0.08)"}
              stroke="white"
              strokeOpacity={isHover ? 1 : 0.7}
              strokeWidth={isHover ? 1.5 : 1}
            />
            <text
              x={14}
              y={NODE_H / 2 + 4}
              fontSize="13"
              fontFamily="var(--font-sans)"
              fill={isHover ? "var(--trace-orange)" : "white"}
              fontWeight="500"
            >
              {n.label}
            </text>
            {/* Anchor markers on the node corners */}
            {isHover &&
              [
                [0, 0],
                [n.w, 0],
                [0, NODE_H],
                [n.w, NODE_H],
              ].map(([x, y], i) => (
                <rect
                  key={i}
                  x={x - 2}
                  y={y - 2}
                  width="4"
                  height="4"
                  fill="white"
                  stroke="var(--trace-orange)"
                  strokeWidth="1"
                />
              ))}
          </g>
        );
      })}
    </svg>
  );
}
