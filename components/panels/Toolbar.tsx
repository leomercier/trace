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
    <div className="pointer-events-auto fixed left-1/2 top-16 z-20 -translate-x-1/2 rounded-md border border-border bg-panel p-1 shadow-md md:left-4 md:top-20 md:translate-x-0">
      <div className="flex gap-1">
        {items.map((t) => (
          <button
            key={t.id}
            title={`${t.label} (${t.key})`}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded text-ink-muted hover:bg-panel-muted hover:text-ink",
              tool === t.id && "bg-ink text-white hover:bg-ink hover:text-white",
            )}
          >
            <t.icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
