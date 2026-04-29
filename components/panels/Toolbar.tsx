"use client";

import { MousePointer2, Hand, Ruler, StickyNote, Crosshair } from "lucide-react";
import { useEditor, type Tool } from "@/stores/editorStore";
import { cn } from "@/lib/utils/cn";

const TOOLS: { id: Tool; label: string; icon: typeof Hand; key: string; viewerOk?: boolean }[] = [
  { id: "select", label: "Select", icon: MousePointer2, key: "V", viewerOk: true },
  { id: "pan", label: "Pan", icon: Hand, key: "H", viewerOk: true },
  { id: "measure", label: "Measure", icon: Ruler, key: "M" },
  { id: "note", label: "Note", icon: StickyNote, key: "N" },
  { id: "calibrate", label: "Calibrate", icon: Crosshair, key: "C" },
];

export function Toolbar() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const canEdit = useEditor((s) => s.canEdit);

  const items = TOOLS.filter((t) => canEdit || t.viewerOk);

  return (
    <div
      className={cn(
        "pointer-events-auto fixed left-1/2 z-20 -translate-x-1/2 rounded-md border border-border bg-panel p-1 shadow-md",
        // Bottom-centre on every breakpoint. Sits above the mobile bottom
        // sheet on small screens; floats above the canvas on desktop.
        "bottom-20 md:bottom-6",
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex gap-1">
        {items.map((t) => (
          <button
            key={t.id}
            title={`${t.label} (${t.key})`}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded text-ink-muted hover:bg-panel-muted hover:text-ink md:h-10 md:w-10",
              tool === t.id && "bg-ink text-white hover:bg-ink hover:text-white",
            )}
          >
            <t.icon size={18} className="md:hidden" />
            <t.icon size={16} className="hidden md:block" />
          </button>
        ))}
      </div>
    </div>
  );
}
