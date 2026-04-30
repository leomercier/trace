"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom" | "left" | "right";

const DEFAULT_DELAY_MS = 2000;
const HIDE_GAP_PX = 6;

interface TooltipProps {
  content: ReactNode;
  /** Hover dwell time before the tooltip appears. Defaults to 2 s. */
  delay?: number;
  /** Preferred side; flips to the opposite side if it would clip. */
  side?: Side;
  /** Optional shortcut hint shown to the right of the content. */
  shortcut?: string;
  /** Anchor element. Must be a single React element that accepts ref/handlers. */
  children: ReactElement;
  disabled?: boolean;
}

/**
 * Tooltip that waits {@link DEFAULT_DELAY_MS} before showing. The first
 * pointerleave or focus loss cancels the timer so quick passes don't get
 * spammed with popups. Built on a portal so positioning ignores overflow:
 * hidden ancestors.
 */
export function Tooltip({
  content,
  delay = DEFAULT_DELAY_MS,
  side = "top",
  shortcut,
  children,
  disabled,
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; side: Side }>({
    x: 0,
    y: 0,
    side,
  });

  const cancel = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const schedule = () => {
    if (disabled || !content) return;
    cancel();
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    cancel();
    setOpen(false);
  };

  useEffect(() => () => cancel(), []);

  // Hide on scroll/resize/escape so a stale tooltip never sits over the page.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => hide();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tipRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const t = tipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let s: Side = side;
    if (s === "top" && a.top - t.height - HIDE_GAP_PX < 0) s = "bottom";
    if (s === "bottom" && a.bottom + t.height + HIDE_GAP_PX > vh) s = "top";
    if (s === "left" && a.left - t.width - HIDE_GAP_PX < 0) s = "right";
    if (s === "right" && a.right + t.width + HIDE_GAP_PX > vw) s = "left";
    let x = 0;
    let y = 0;
    if (s === "top") {
      x = a.left + a.width / 2 - t.width / 2;
      y = a.top - t.height - HIDE_GAP_PX;
    } else if (s === "bottom") {
      x = a.left + a.width / 2 - t.width / 2;
      y = a.bottom + HIDE_GAP_PX;
    } else if (s === "left") {
      x = a.left - t.width - HIDE_GAP_PX;
      y = a.top + a.height / 2 - t.height / 2;
    } else {
      x = a.right + HIDE_GAP_PX;
      y = a.top + a.height / 2 - t.height / 2;
    }
    // Clamp to viewport with a small inset.
    x = Math.max(6, Math.min(vw - t.width - 6, x));
    y = Math.max(6, Math.min(vh - t.height - 6, y));
    setPos({ x, y, side: s });
  }, [open, side, content]);

  // Wire pointer/focus handlers onto the cloned child so we don't render an
  // extra wrapper element that would change layout.
  const child = children;
  const handlers = {
    ref: (el: HTMLElement | null) => {
      anchorRef.current = el;
      const orig = (child as any).ref;
      if (typeof orig === "function") orig(el);
      else if (orig && "current" in orig) orig.current = el;
    },
    onPointerEnter: (e: React.PointerEvent) => {
      schedule();
      child.props.onPointerEnter?.(e);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      hide();
      child.props.onPointerLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      schedule();
      child.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      child.props.onBlur?.(e);
    },
    onClick: (e: React.MouseEvent) => {
      hide();
      child.props.onClick?.(e);
    },
    "aria-describedby": open ? id : child.props["aria-describedby"],
  };

  // Strip the native title to avoid double tooltips.
  const cloned = (() => {
    const { title: _stripped, ...rest } = child.props as Record<string, unknown>;
    const Component = child.type as any;
    return <Component {...rest} {...handlers} />;
  })();

  if (typeof document === "undefined") return cloned;

  return (
    <>
      {cloned}
      {open && content
        ? createPortal(
            <div
              id={id}
              role="tooltip"
              ref={tipRef}
              className="pointer-events-none fixed z-[1000] flex max-w-xs items-center gap-1.5 rounded-md bg-ink px-2 py-1 text-[11px] leading-snug text-white shadow-lg"
              style={{ left: pos.x, top: pos.y }}
            >
              <span>{content}</span>
              {shortcut ? (
                <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-num text-[10px] uppercase tracking-wide">
                  {shortcut}
                </kbd>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
