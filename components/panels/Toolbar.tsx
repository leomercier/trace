"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useEditor, type Tool } from "@/stores/editorStore";
import { cn } from "@/lib/utils/cn";

const TOOLS: {
  id: Tool;
  label: string;
  hint: string;
  icon: IconName;
  key: string;
  viewerOk?: boolean;
}[] = [
  {
    id: "select",
    label: "Select",
    hint: "Click items to select. Drag to move, resize, or rotate.",
    icon: "cursor",
    key: "V",
    viewerOk: true,
  },
  {
    id: "pan",
    label: "Pan",
    hint: "Click and drag to pan the canvas. Hold Space + drag with any tool.",
    icon: "hand",
    key: "H",
    viewerOk: true,
  },
  {
    id: "measure",
    label: "Measure",
    hint: "Click two points to draw a measurement. Snaps to drawing endpoints.",
    icon: "measure",
    key: "M",
  },
  {
    id: "note",
    label: "Sticky note",
    hint: "Click anywhere to drop a sticky note.",
    icon: "sticky-note",
    key: "N",
  },
  {
    id: "text",
    label: "Text",
    hint: "Click to add text on the canvas.",
    icon: "text",
    key: "T",
  },
  {
    id: "line",
    label: "Line",
    hint: "Click two points to draw a line.",
    icon: "line",
    key: "L",
  },
  {
    id: "rect",
    label: "Rectangle",
    hint: "Click and drag to draw a rectangle.",
    icon: "rect",
    key: "R",
  },
];

// Tools surfaced in the overflow menu (chevron on the right of the toolbar)
// rather than inline. Keeps the main bar narrow enough for a 375pt phone.
const OVERFLOW_TOOLS: {
  id: Tool;
  label: string;
  hint: string;
  icon: IconName;
  key: string;
}[] = [
  {
    id: "calibrate",
    label: "Calibrate scale",
    hint: "Pick two points whose real-world distance you know, then enter the length.",
    icon: "calibrate",
    key: "C",
  },
];

export function Toolbar({
  attachmentCount = 0,
  onOpenAttachments,
  onFit,
  onExportPng,
}: {
  attachmentCount?: number;
  onOpenAttachments?: () => void;
  onFit?: () => void;
  onExportPng?: () => void;
}) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const canEdit = useEditor((s) => s.canEdit);

  const items = TOOLS.filter((t) => canEdit || t.viewerOk);
  const overflowItems = OVERFLOW_TOOLS.filter(() => canEdit);

  const [moreOpen, setMoreOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as any)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [moreOpen]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "pointer-events-auto fixed left-1/2 z-20 -translate-x-1/2 rounded-md border border-border bg-panel p-1 shadow-md",
        // Sit just above the safe-area on mobile, slightly higher on
        // desktop where there's no bottom chrome.
        "bottom-3 md:bottom-6",
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-0.5 md:gap-1">
        {items.map((t) => (
          <Tooltip key={t.id} label={t.label} hint={t.hint} keyHint={t.key}>
            <button
              onClick={() => setTool(t.id)}
              aria-label={t.label}
              className={cn(
                "flex size-9 items-center justify-center rounded text-ink-muted hover:bg-panel-muted hover:text-ink md:size-10",
                tool === t.id && "bg-ink text-white hover:bg-ink hover:text-white",
              )}
            >
              <Icon name={t.icon} size={16} />
            </button>
          </Tooltip>
        ))}

        {/* Overflow menu — attachments, fit, export, etc. */}
        <div className="relative">
          <Tooltip label="More tools" hint="Calibrate, files, fit-to-content, export.">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="More tools"
            className={cn(
              "flex size-9 items-center justify-center rounded text-ink-muted hover:bg-panel-muted hover:text-ink md:size-10",
              moreOpen && "bg-panel-muted text-ink",
            )}
          >
            <Icon
              name="more"
              size={16}
              className={cn("transition-transform", moreOpen && "rotate-90")}
            />
            {attachmentCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-measure px-1 font-num text-[10px] text-white">
                {attachmentCount}
              </span>
            ) : null}
          </button>
          </Tooltip>

          {moreOpen ? (
            <div
              className="absolute bottom-full right-0 mb-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-panel p-1 shadow-md"
              style={{ minWidth: 160 }}
            >
              {overflowItems.map((t) => (
                <Tooltip key={t.id} label={t.label} hint={t.hint} keyHint={t.key}>
                  <button
                    onClick={() => {
                      setTool(t.id);
                      setMoreOpen(false);
                    }}
                    aria-label={t.label}
                    className={cn(
                      "flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] hover:bg-panel-muted",
                      tool === t.id ? "bg-ink text-white hover:bg-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <Icon name={t.icon} size={16} />
                    <span>{t.label}</span>
                  </button>
                </Tooltip>
              ))}
              {onOpenAttachments ? (
                <Tooltip label="Attachments" hint="Reference photos and PDFs that aren't on the canvas.">
                  <button
                    onClick={() => {
                      onOpenAttachments();
                      setMoreOpen(false);
                    }}
                    aria-label="Attachments"
                    className="flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] text-ink-muted hover:bg-panel-muted hover:text-ink"
                  >
                    <Icon name="upload" size={16} />
                    <span>
                      Files{attachmentCount > 0 ? ` · ${attachmentCount}` : ""}
                    </span>
                  </button>
                </Tooltip>
              ) : null}
              {onFit ? (
                <Tooltip label="Fit to content" hint="Zoom to show every drawing, item, and measurement." keyHint="F">
                  <button
                    onClick={() => {
                      onFit();
                      setMoreOpen(false);
                    }}
                    aria-label="Fit to content"
                    className="flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] text-ink-muted hover:bg-panel-muted hover:text-ink"
                  >
                    <Icon name="crop" size={16} />
                    <span>Fit</span>
                  </button>
                </Tooltip>
              ) : null}
              {onExportPng ? (
                <Tooltip label="Export PNG" hint="Save the visible canvas as a PNG image.">
                  <button
                    onClick={() => {
                      onExportPng();
                      setMoreOpen(false);
                    }}
                    aria-label="Export PNG"
                    className="flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] text-ink-muted hover:bg-panel-muted hover:text-ink"
                  >
                    <Icon name="download" size={16} />
                    <span>Export</span>
                  </button>
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight tooltip — wraps a single trigger element. Shows a labelled
 * card with an explanation and optional keyboard shortcut on hover/focus.
 * Hidden on touch devices (the `hover:` rule means a touch tap won't open
 * it; tap goes straight to the underlying button).
 */
function Tooltip({
  label,
  hint,
  keyHint,
  children,
}: {
  label: string;
  hint?: string;
  keyHint?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-ink px-2 py-1.5 text-[11px] text-white shadow-lg group-hover:block group-focus-within:block"
      >
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{label}</span>
          {keyHint ? (
            <kbd className="rounded border border-white/20 bg-white/10 px-1 font-num text-[9px] uppercase">
              {keyHint}
            </kbd>
          ) : null}
        </span>
        {hint ? (
          <span className="mt-0.5 block whitespace-normal text-[10px] font-normal text-white/70" style={{ maxWidth: 200 }}>
            {hint}
          </span>
        ) : null}
      </span>
    </span>
  );
}
