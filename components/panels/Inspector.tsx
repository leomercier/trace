"use client";

import { useEditor } from "@/stores/editorStore";
import { formatLength, type Unit } from "@/lib/utils/units";
import { useState } from "react";
import type { Measurement } from "@/lib/supabase/types";
import { Trash2 } from "lucide-react";

export function Inspector({
  pageName,
  onRename,
  onDeleteSelection,
  onRenameMeasurement,
  onDeleteMeasurement,
  scaleControls,
}: {
  pageName: string;
  onRename: (name: string) => void;
  onDeleteSelection: () => void;
  onRenameMeasurement: (id: string, label: string | null) => void;
  onDeleteMeasurement: (id: string) => void;
  scaleControls: React.ReactNode;
}) {
  const selection = useEditor((s) => s.selection);
  const measurements = useEditor((s) => s.measurements);
  const setSelection = useEditor((s) => s.setSelection);
  const scale = useEditor((s) => s.scale);
  const layers = useEditor((s) => s.layers);
  const toggleLayer = useEditor((s) => s.toggleLayer);
  const canEdit = useEditor((s) => s.canEdit);

  const [name, setName] = useState(pageName);
  const measurementList = Object.values(measurements).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const sel =
    selection?.kind === "measurement" ? measurements[selection.id] : null;

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-panel md:flex">
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

      {sel ? (
        <div className="border-b border-border p-4">
          <div className="text-xs uppercase tracking-wider text-ink-faint">Selected</div>
          <SelectedMeasurement
            m={sel}
            scale={scale}
            canEdit={canEdit}
            onRename={onRenameMeasurement}
            onDelete={onDeleteSelection}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-ink-faint">
            Measurements
          </div>
          <div className="font-num text-xs text-ink-faint">
            {measurementList.length}
          </div>
        </div>
        <ul className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {measurementList.length === 0 ? (
            <li className="text-sm text-ink-muted">
              {canEdit
                ? "Press M and click two points to start."
                : "No measurements."}
            </li>
          ) : null}
          {measurementList.map((m) => (
            <MeasurementRow
              key={m.id}
              m={m}
              scale={scale}
              selected={selection?.kind === "measurement" && selection.id === m.id}
              canEdit={canEdit}
              onSelect={() => setSelection({ kind: "measurement", id: m.id })}
              onRename={onRenameMeasurement}
              onDelete={() => onDeleteMeasurement(m.id)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function MeasurementRow({
  m,
  scale,
  selected,
  canEdit,
  onSelect,
  onRename,
  onDelete,
}: {
  m: Measurement;
  scale: { realPerUnit: number; unit: Unit } | null;
  selected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onRename: (id: string, label: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(m.label || "");
  const len = Math.hypot(+m.bx - +m.ax, +m.by - +m.ay);
  const lenStr = scale
    ? formatLength(len * scale.realPerUnit, scale.unit)
    : `${len.toFixed(2)} u`;

  return (
    <li
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 ${
        selected ? "bg-panel-muted" : "hover:bg-panel-muted"
      }`}
    >
      <span className="size-2 shrink-0 rounded-full bg-measure" aria-hidden />
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => {
              setEditing(false);
              onRename(m.id, label.trim() || null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setLabel(m.label || "");
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Name this measurement"
            className="w-full bg-transparent text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) setEditing(true);
              else onSelect();
            }}
            className="block w-full truncate text-left text-sm"
            title={canEdit ? "Click to rename" : ""}
          >
            {m.label || (
              <span className="text-ink-muted italic">Unnamed</span>
            )}
          </button>
        )}
      </div>
      <span className="font-num text-xs text-ink-muted">{lenStr}</span>
      {canEdit ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 size={12} className="text-ink-faint hover:text-measure" />
        </button>
      ) : null}
    </li>
  );
}

function SelectedMeasurement({
  m,
  scale,
  canEdit,
  onRename,
  onDelete,
}: {
  m: Measurement;
  scale: { realPerUnit: number; unit: Unit } | null;
  canEdit: boolean;
  onRename: (id: string, label: string | null) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(m.label || "");
  const len = Math.hypot(+m.bx - +m.ax, +m.by - +m.ay);
  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">
          Name
        </div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label !== (m.label || "")) onRename(m.id, label.trim() || null);
          }}
          disabled={!canEdit}
          placeholder="Unnamed"
          className="w-full rounded-md border border-border bg-panel-muted px-2 py-1.5 text-sm outline-none focus:border-ink"
        />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-faint">Length</div>
        <div className="font-num text-2xl">
          {scale ? formatLength(len * scale.realPerUnit, scale.unit) : `${len.toFixed(2)} u`}
        </div>
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
