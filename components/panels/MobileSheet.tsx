"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useEditor } from "@/stores/editorStore";
import { formatLength } from "@/lib/utils/units";

/**
 * Bottom sheet for mobile (< md). Mirrors a pared-down Inspector and surfaces
 * the most useful data: scale, current selection, and quick actions.
 */
export function MobileSheet({
  pageName,
  onCalibrateStart,
  onDeleteSelection,
}: {
  pageName: string;
  onCalibrateStart: () => void;
  onDeleteSelection: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selection = useEditor((s) => s.selection);
  const measurements = useEditor((s) => s.measurements);
  const scale = useEditor((s) => s.scale);
  const canEdit = useEditor((s) => s.canEdit);

  const sel = selection?.kind === "measurement" ? measurements[selection.id] : null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 border-t border-border bg-panel shadow-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
      >
        <div className="flex flex-col items-start text-left">
          <span className="text-[11px] uppercase tracking-wider text-ink-faint">
            {pageName}
          </span>
          <span className="font-num text-base">
            {sel
              ? scale
                ? formatLength(
                    Math.hypot(+sel.bx - +sel.ax, +sel.by - +sel.ay) * scale.realPerUnit,
                    scale.unit,
                  )
                : `${Math.hypot(+sel.bx - +sel.ax, +sel.by - +sel.ay).toFixed(2)} u`
              : scale
              ? `1u = ${scale.realPerUnit.toPrecision(3)} ${scale.unit}`
              : "Tap measure to start"}
          </span>
        </div>
        {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>
      {open ? (
        <div className="border-t border-border p-4">
          {scale ? (
            <div className="mb-3 text-sm text-ink-muted">
              Scale: 1 unit = {scale.realPerUnit.toPrecision(4)} {scale.unit}
            </div>
          ) : (
            <div className="mb-3 text-sm text-measure">Not calibrated</div>
          )}
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  onCalibrateStart();
                }}
                className="rounded-md border border-border bg-panel-muted px-3 py-2 text-sm"
              >
                Calibrate scale
              </button>
              {sel ? (
                <button
                  onClick={onDeleteSelection}
                  className="rounded-md border border-border bg-panel-muted px-3 py-2 text-sm text-measure"
                >
                  Delete selection
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
