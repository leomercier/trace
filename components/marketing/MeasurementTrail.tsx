"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMousePosition";

type Dot = {
  el: HTMLSpanElement;
  born: number;
};

const LIFE_MS = 700;
const MIN_DIST = 28;

export function MeasurementTrail() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const container = containerRef.current;
    if (!container) return;

    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const last = lastRef.current;
      if (last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return;
      }
      lastRef.current = { x: e.clientX, y: e.clientY };
      const dot = document.createElement("span");
      dot.className =
        "pointer-events-none fixed block h-1.5 w-1.5 rounded-full bg-measure";
      dot.style.left = `${e.clientX - 3}px`;
      dot.style.top = `${e.clientY - 3}px`;
      dot.style.opacity = "0.8";
      dot.style.transition = "opacity 700ms linear, transform 700ms linear";
      container.appendChild(dot);
      dotsRef.current.push({ el: dot, born: performance.now() });
      requestAnimationFrame(() => {
        dot.style.opacity = "0";
        dot.style.transform = "scale(0.5)";
      });
    };

    const tick = () => {
      const now = performance.now();
      dotsRef.current = dotsRef.current.filter(({ el, born }) => {
        if (now - born > LIFE_MS) {
          el.remove();
          return false;
        }
        return true;
      });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      dotsRef.current.forEach(({ el }) => el.remove());
      dotsRef.current = [];
    };
  }, [reduce]);

  return <div ref={containerRef} aria-hidden="true" />;
}
