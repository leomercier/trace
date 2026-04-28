"use client";

import { useEditor } from "@/stores/editorStore";
import { formatLength, type Unit } from "@/lib/utils/units";
import { useState } from "react";
import type { Measurement, PlacedItem } from "@/lib/supabase/types";
import { Trash2, RotateCw } from "lucide-react";

export function Inspector({
  pageName,
  onRename,
  onDeleteSelection,
  onRenameMeasurement,
  onDeleteMeasurement,
  onUpdatePlacedItem,
  scaleControls,
}: {
  pageName: string;
  onRename: (name: string) => void;
  onDeleteSelection: () => void;
  onRenameMeasurement: (id: string, label: string | null) => void;
  onDeleteMeasurement: (id: string) => void;
  onUpdatePlacedItem: (id: string, patch: Partial<PlacedItem>) => void;
  scaleControls: React.ReactNode;
}) {
  const selection = useEditor((s) => s.selection);
  const measurements = useEditor((s) => s.measurements);
  const placedItems = useEditor((s) => s.placedItems);
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
  const placedList = Object.values(placedItems);

  const measurementSel =
    selection?.kind === "measurement" ? measurements[selection.id] : null;
  const placedSel =
    selection?.kind === "placed" ? placedItems[selection.id] : null;

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

      {placedSel ? (
        <div className="border-b border-border p-4">
          <div className="text-xs uppercase tracking-wider text-ink-faint">Properties</div>
          <PlacedItemProperties
            item={placedSel}
            scale={scale}
            canEdit={canEdit}
            onUpdate={(patch) => onUpdatePlacedItem(placedSel.id, patch)}
            onDelete={onDeleteSelection}
          />
        </div>
      ) : null}

      {measurementSel ? (
        <div className="border-b border-border p-4">
          <div className="text-xs uppercase tracking-wider text-ink-faint">Selected</div>
          <SelectedMeasurement
            m={measurementSel}
            scale={scale}
            canEdit={canEdit}
            onRename={onRenameMeasurement}
            onDelete={onDeleteSelection}
          />
        </div>
      ) : null}

      {placedList.length > 0 ? (
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-ink-faint">Items</div>
            <div className="font-num text-xs text-ink-faint">{placedList.length}</div>
          </div>
          <ul className="mt-2 space-y-1">
            {placedList.map((p) => (
              <li
                key={p.id}
                onClick={() => setSelection({ kind: "placed", id: p.id })}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 ${
                  selection?.kind === "placed" && selection.id === p.id
                    ? "bg-panel-muted"
                    : "hover:bg-panel-muted"
                }`}
              >
                <div
                  className="size-7 shrink-0 rounded border border-border bg-canvas p-0.5"
                  dangerouslySetInnerHTML={{ __html: p.svg_markup }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{p.name}</div>
                  <div className="font-num text-[10px] text-ink-faint">
                    {p.width_mm}×{p.depth_mm}mm
                  </div>
                </div>
              </li>
            ))}
          </ul>
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

function Pair({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded border border-border bg-panel-muted p-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="font-num text-sm">{v}</div>
    </div>
  );
}

function PlacedItemProperties({
  item,
  scale,
  canEdit,
  onUpdate,
  onDelete,
}: {
  item: PlacedItem;
  scale: { realPerUnit: number; unit: Unit } | null;
  canEdit: boolean;
  onUpdate: (patch: Partial<PlacedItem>) => void;
  onDelete: () => void;
}) {
  const w = item.width_mm * (Number(item.scale_w) || 1);
  const d = item.depth_mm * (Number(item.scale_d) || 1);
  const h = item.height_mm;
  const unit = scale?.unit || "mm";
  const areaM2 = (w / 1000) * (d / 1000);
  const rotation = Math.round((((Number(item.rotation) || 0) % 360) + 360) % 360);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="text-sm font-medium">{item.name}</div>
        {item.brand ? <div className="text-xs text-ink-muted">{item.brand}</div> : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <DimField
          label="W"
          unit={unit}
          mm={w}
          editable={canEdit}
          onCommit={(newMm) => onUpdate({ scale_w: newMm / item.width_mm })}
        />
        <DimField
          label="D"
          unit={unit}
          mm={d}
          editable={canEdit}
          onCommit={(newMm) => onUpdate({ scale_d: newMm / item.depth_mm })}
        />
        <DimField label="H" unit={unit} mm={h} editable={false} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Pair label="Area" v={`${areaM2.toFixed(2)} m²`} />
        <Pair label="Rotation" v={`${rotation}°`} />
      </div>

      {canEdit ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onUpdate({ rotation: ((Number(item.rotation) || 0) + 90) % 360 })
            }
            className="flex h-8 items-center gap-1 rounded border border-border bg-panel-muted px-2 text-xs hover:bg-panel"
          >
            <RotateCw size={12} /> 90°
          </button>
          <button
            onClick={() => onUpdate({ scale_w: 1, scale_d: 1, rotation: 0 })}
            className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            Reset size
          </button>
          <button
            onClick={onDelete}
            className="ml-auto text-xs text-measure underline underline-offset-4 hover:no-underline"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DimField({
  label,
  unit,
  mm,
  editable,
  onCommit,
}: {
  label: string;
  unit: Unit;
  mm: number;
  editable: boolean;
  onCommit?: (newMm: number) => void;
}) {
  const display = formatDimLocal(mm, unit);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(display.value);

  return (
    <div className="rounded border border-border bg-panel-muted p-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
      {editing && editable ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const n = parseFloat(val);
            if (Number.isFinite(n) && n > 0 && onCommit) {
              const newMm = toMmFromUnit(n, unit);
              if (Math.abs(newMm - mm) > 0.5) onCommit(newMm);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setVal(display.value);
              setEditing(false);
            }
          }}
          className="w-full bg-transparent font-num text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (editable) {
              setVal(display.value);
              setEditing(true);
            }
          }}
          className="block w-full text-left font-num text-sm"
          title={editable ? "Click to edit" : ""}
        >
          {display.value} <span className="text-ink-faint">{display.unit}</span>
        </button>
      )}
    </div>
  );
}

function formatDimLocal(mm: number, unit: Unit): { value: string; unit: string } {
  if (unit === "mm") return { value: Math.round(mm).toString(), unit: "mm" };
  if (unit === "cm") return { value: (mm / 10).toFixed(1), unit: "cm" };
  if (unit === "m") return { value: (mm / 1000).toFixed(3), unit: "m" };
  if (unit === "in") return { value: (mm / 25.4).toFixed(2), unit: "in" };
  if (unit === "ft") return { value: (mm / 304.8).toFixed(2), unit: "ft" };
  return { value: mm.toString(), unit };
}

function toMmFromUnit(value: number, unit: Unit): number {
  if (unit === "mm") return value;
  if (unit === "cm") return value * 10;
  if (unit === "m") return value * 1000;
  if (unit === "in") return value * 25.4;
  if (unit === "ft") return value * 304.8;
  return value;
}
