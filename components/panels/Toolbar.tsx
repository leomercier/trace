"use client";

import { useEffect, useRef, useState } from "react";
import { Slash } from "lucide-react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useEditor, type Tool } from "@/stores/editorStore";
import { cn } from "@/lib/utils/cn";

const TOOLS: {
  id: Tool;
  label: string;
  icon: IconName;
  key: string;
  viewerOk?: boolean;
}[] = [
  { id: "select", label: "Select", icon: "cursor", key: "V", viewerOk: true },
  { id: "pan", label: "Pan", icon: "hand", key: "H", viewerOk: true },
  { id: "measure", label: "Measure", icon: "measure", key: "M" },
  { id: "note", label: "Note", icon: "note", key: "N" },
  { id: "text", label: "Text", icon: "text", key: "T" },
  // No "line" in the Hugeicons free set yet — keep lucide's Slash here
  // until we either find a dedicated diagonal-line icon or vendor an SVG.
  { id: "line", label: "Line", icon: "line" as IconName, key: "L" },
  { id: "rect", label: "Rectangle", icon: "rect", key: "R" },
];

// Tools surfaced in the overflow menu (chevron on the right of the toolbar)
// rather than inline. Keeps the main bar narrow enough for a 375pt phone.
const OVERFLOW_TOOLS: { id: Tool; label: string; icon: IconName; key: string }[] = [
  { id: "calibrate", label: "Calibrate", icon: "calibrate", key: "C" },
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
          <button
            key={t.id}
            title={`${t.label} (${t.key})`}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex size-9 items-center justify-center rounded text-ink-muted hover:bg-panel-muted hover:text-ink md:size-10",
              tool === t.id && "bg-ink text-white hover:bg-ink hover:text-white",
            )}
          >
            {t.id === "line" ? (
              <Slash size={16} />
            ) : (
              <Icon name={t.icon} size={16} />
            )}
          </button>
        ))}

        {/* Overflow menu — attachments, fit, export, etc. */}
        <div className="relative">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            title="More"
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

          {moreOpen ? (
            <div
              className="absolute bottom-full right-0 mb-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-panel p-1 shadow-md"
              style={{ minWidth: 160 }}
            >
              {overflowItems.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTool(t.id);
                    setMoreOpen(false);
                  }}
                  title={`${t.label} (${t.key})`}
                  className={cn(
                    "flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] hover:bg-panel-muted",
                    tool === t.id ? "bg-ink text-white hover:bg-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <Icon name={t.icon} size={16} />
                  <span>{t.label}</span>
                </button>
              ))}
              {onOpenAttachments ? (
                <button
                  onClick={() => {
                    onOpenAttachments();
                    setMoreOpen(false);
                  }}
                  className="flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] text-ink-muted hover:bg-panel-muted hover:text-ink"
                  title="Attachments"
                >
                  <Icon name="upload" size={16} />
                  <span>
                    Files{attachmentCount > 0 ? ` · ${attachmentCount}` : ""}
                  </span>
                </button>
              ) : null}
              {onFit ? (
                <button
                  onClick={() => {
                    onFit();
                    setMoreOpen(false);
                  }}
                  className="flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] text-ink-muted hover:bg-panel-muted hover:text-ink"
                  title="Fit to content"
                >
                  <Icon name="crop" size={16} />
                  <span>Fit</span>
                </button>
              ) : null}
              {onExportPng ? (
                <button
                  onClick={() => {
                    onExportPng();
                    setMoreOpen(false);
                  }}
                  className="flex h-10 flex-col items-center justify-center gap-0.5 rounded px-2 text-[10px] text-ink-muted hover:bg-panel-muted hover:text-ink"
                  title="Export PNG"
                >
                  <Icon name="download" size={16} />
                  <span>Export</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
