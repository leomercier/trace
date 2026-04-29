"use client";

import { useEffect, useRef, useState } from "react";

export type MousePosition = {
  x: number;
  y: number;
  nx: number;
  ny: number;
};

const initial: MousePosition = { x: 0, y: 0, nx: 0.5, ny: 0.5 };

export function useMousePosition(): MousePosition {
  const [pos, setPos] = useState<MousePosition>(initial);
  const raf = useRef<number | null>(null);
  const next = useRef<MousePosition>(initial);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      next.current = {
        x: e.clientX,
        y: e.clientY,
        nx: e.clientX / w,
        ny: e.clientY / h,
      };
      if (raf.current == null) {
        raf.current = requestAnimationFrame(() => {
          raf.current = null;
          setPos(next.current);
        });
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  return pos;
}

export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}
