"use client";

import { useEditor } from "@/stores/editorStore";
import { formatLength, UNITS, type Unit } from "@/lib/utils/units";
import { useState } from "react";

export function Inspector({
  pageName,
  onRename,
  onDeleteSelection,
  scaleControls,
}: {
  pageName: string;
  onRename: (name: string) => void;
  onDeleteSelection: () => void;
  scaleControls: React.ReactNode;
}) {
  const selection = useEditor((s) => s.selection);
  const measurements = useEditor((s) => s.measurements);
  const notes = useEditor((s) => s.notes);
  const scale = useEditor((s) => s.scale);
  const layers = useEditor((s) => s.layers);
  const toggleLayer = useEditor((s) => s.toggleLayer);
  const canEdit = useEditor((s) => s.canEdit);

  const [name, setName] = useState(pageName);

  const sel =
    selection?.kind === "measurement"
      ? measurements[selection.id]
      : selection?.kind === "note"
      ? notes[selection.id]
      : null;

  return (
    <aside className="hidden w-80 shrink-0 border-l border-border bg-panel md:block">
      <div className="border-b border-border p-4">
        <div className="text-xs uppercase tracking-wider text-ink-faint">Page</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name && name !== pageName) onRename(name);
          }}
          disabled={!canEdit}
          className="mt-1 w-full bg-transparent font-serif text-xl outline-none disabled:text-ink-muted"
        />
      </div>

      <div className="border-b border-border p-4">
        <div className="text-xs uppercase tracking-wider text-ink-faint">Scale</div>
        {scale ? (
          <div className="mt-2 font-num text-sm text-ink">
            1 unit = {scale.realPerUnit.toPrecision(4)} {scale.unit}
          </div>
        ) : (
          <div className="mt-2 text-sm text-ink-muted">Not calibrated</div>
        )}
        <div className="mt-3">{scaleControls}</div>
      </div>

      <div className="border-b border-border p-4">
        <div className="text-xs uppercase tracking-wider text-ink-faint">Layers</div>
        <div className="mt-2 space-y-2">
          {(["measurements", "notes", "cursors"] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={layers[k]}
                onChange={() => toggleLayer(k)}
                className="accent-ink"
              />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="text-xs uppercase tracking-wider text-ink-faint">Selection</div>
        {!sel ? (
          <div className="mt-2 text-sm text-ink-muted">Nothing selected</div>
        ) : selection?.kind === "measurement" ? (
          <MeasurementDetails
            m={sel as any}
            scale={scale}
            canEdit={canEdit}
            onDelete={onDeleteSelection}
          />
        ) : (
          <div className="mt-2 text-sm text-ink-muted">Note selected</div>
        )}
      </div>
    </aside>
  );
}

function MeasurementDetails({
  m,
  scale,
  canEdit,
  onDelete,
}: {
  m: { ax: number; ay: number; bx: number; by: number; label: string | null };
  scale: { realPerUnit: number; unit: Unit } | null;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const len = Math.hypot(+m.bx - +m.ax, +m.by - +m.ay);
  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-faint">Length</div>
        <div className="font-num text-2xl">
          {scale ? formatLength(len * scale.realPerUnit, scale.unit) : `${len.toFixed(2)} u`}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Pair label="A" v={`${(+m.ax).toFixed(1)}, ${(+m.ay).toFixed(1)}`} />
        <Pair label="B" v={`${(+m.bx).toFixed(1)}, ${(+m.by).toFixed(1)}`} />
      </div>
      {canEdit ? (
        <button
          onClick={onDelete}
          className="text-xs text-measure underline underline-offset-4 hover:no-underline"
        >
          Delete measurement
        </button>
      ) : null}
    </div>
  );
}

function Pair({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded border border-border bg-panel-muted p-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="font-num text-sm">{v}</div>
    </div>
  );
}
