"use client";

import { useEditor } from "@/stores/editorStore";
import { formatLength, type Unit } from "@/lib/utils/units";
import { useState } from "react";
import type { Measurement, PlacedItem, Shape, ShapeStyle } from "@/lib/supabase/types";
import {
  Trash2,
  RotateCw,
  Download,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";

export function Inspector({
  pageName,
  onRename,
  onDeleteSelection,
  onRenameMeasurement,
  onDeleteMeasurement,
  onUpdatePlacedItem,
  onChangePlacedItemZ,
  onUpdateShape,
  onDeleteShape,
  onExportPng,
  scaleControls,
  mobileOpen,
  onMobileClose,
}: {
  pageName: string;
  onRename: (name: string) => void;
  onDeleteSelection: () => void;
  onRenameMeasurement: (id: string, label: string | null) => void;
  onDeleteMeasurement: (id: string) => void;
  onUpdatePlacedItem: (id: string, patch: Partial<PlacedItem>) => void;
  onChangePlacedItemZ: (id: string, mode: "front" | "back" | "forward" | "backward") => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
  onDeleteShape: (id: string) => void;
  onExportPng: () => void;
  scaleControls: React.ReactNode;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const selection = useEditor((s) => s.selection);
  const measurements = useEditor((s) => s.measurements);
  const placedItems = useEditor((s) => s.placedItems);
  const setSelection = useEditor((s) => s.setSelection);
  const scale = useEditor((s) => s.scale);
  const layers = useEditor((s) => s.layers);
  const toggleLayer = useEditor((s) => s.toggleLayer);
  const grid = useEditor((s) => s.grid);
  const toggleGrid = useEditor((s) => s.toggleGrid);
  const setGridSize = useEditor((s) => s.setGridSize);
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
  const shapes = useEditor((s) => s.shapes);
  const shapeSel = selection?.kind === "shape" ? shapes[selection.id] : null;

  const asideClass = mobileOpen
    ? "fixed right-0 top-0 z-40 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto border-l border-border bg-panel shadow-lg md:relative md:w-80 md:max-w-none md:shadow-none"
    : "hidden w-80 shrink-0 flex-col border-l border-border bg-panel md:flex";

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      ) : null}
    <aside
      className={asideClass}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {onMobileClose ? (
        <div className="flex items-center justify-between border-b border-border px-3 py-2 md:hidden">
          <div className="text-xs uppercase tracking-wider text-ink-faint">
            Properties
          </div>
          <button
            onClick={onMobileClose}
            className="rounded p-2 text-ink-muted hover:bg-panel-muted hover:text-ink"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
      ) : null}
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
          {(["measurements", "notes", "items", "shapes", "cursors"] as const).map((k) => (
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

      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-ink-faint">Grid</div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={grid.visible}
              onChange={toggleGrid}
              className="accent-ink"
            />
            Show
          </label>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={grid.sizeMM}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n) && n > 0) setGridSize(n);
            }}
            disabled={!grid.visible}
            className="h-9 w-24 rounded-md border border-border bg-panel px-2 font-num text-sm focus:border-ink focus:outline-none disabled:bg-panel-muted disabled:text-ink-faint"
          />
          <span className="text-xs text-ink-muted">mm per cell</span>
        </div>
        {!scale ? (
          <div className="mt-2 text-[11px] text-ink-faint">
            Calibrate scale for the grid to match real units.
          </div>
        ) : null}
      </div>

      <div className="border-b border-border p-4">
        <div className="text-xs uppercase tracking-wider text-ink-faint">Export</div>
        <button
          onClick={onExportPng}
          className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-panel-muted text-sm hover:bg-panel"
        >
          <Download size={14} /> Export as PNG
        </button>
      </div>

      {shapeSel ? (
        <div className="border-b border-border p-4">
          <div className="text-xs uppercase tracking-wider text-ink-faint">Shape</div>
          <ShapeProperties
            shape={shapeSel}
            canEdit={canEdit}
            onUpdate={(patch) => onUpdateShape(shapeSel.id, patch)}
            onDelete={() => onDeleteShape(shapeSel.id)}
          />
        </div>
      ) : null}

      {placedSel ? (
        <div className="border-b border-border p-4">
          <div className="text-xs uppercase tracking-wider text-ink-faint">Properties</div>
          <PlacedItemProperties
            item={placedSel}
            scale={scale}
            canEdit={canEdit}
            onUpdate={(patch) => onUpdatePlacedItem(placedSel.id, patch)}
            onChangeZ={(mode) => onChangePlacedItemZ(placedSel.id, mode)}
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
    </>
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
  onChangeZ,
  onDelete,
}: {
  item: PlacedItem;
  scale: { realPerUnit: number; unit: Unit } | null;
  canEdit: boolean;
  onUpdate: (patch: Partial<PlacedItem>) => void;
  onChangeZ: (mode: "front" | "back" | "forward" | "backward") => void;
  onDelete: () => void;
}) {
  const w = item.width_mm * (Number(item.scale_w) || 1);
  const d = item.depth_mm * (Number(item.scale_d) || 1);
  const h = item.height_mm;
  const unit = scale?.unit || "mm";
  const areaM2 = (w / 1000) * (d / 1000);
  const rotation = Math.round((((Number(item.rotation) || 0) % 360) + 360) % 360);
  const editable = canEdit && !item.locked;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{item.name}</div>
          {item.brand ? (
            <div className="truncate text-xs text-ink-muted">{item.brand}</div>
          ) : null}
        </div>
        {canEdit ? (
          <button
            onClick={() => onUpdate({ locked: !item.locked })}
            title={item.locked ? "Unlock" : "Lock"}
            className={`flex h-7 items-center gap-1 rounded border px-2 text-xs ${
              item.locked
                ? "border-ink bg-ink text-white"
                : "border-border bg-panel-muted text-ink-muted hover:text-ink"
            }`}
          >
            {item.locked ? <Lock size={11} /> : <Unlock size={11} />}
            {item.locked ? "Locked" : "Lock"}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <DimField
          label="W"
          unit={unit}
          mm={w}
          editable={editable}
          onCommit={(newMm) => onUpdate({ scale_w: newMm / item.width_mm })}
        />
        <DimField
          label="D"
          unit={unit}
          mm={d}
          editable={editable}
          onCommit={(newMm) => onUpdate({ scale_d: newMm / item.depth_mm })}
        />
        <DimField label="H" unit={unit} mm={h} editable={false} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Pair label="Area" v={`${areaM2.toFixed(2)} m²`} />
        <Pair label="Rotation" v={`${rotation}°`} />
      </div>

      {editable ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate({ rotation: ((Number(item.rotation) || 0) + 90) % 360 })}
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
        </div>
      ) : null}

      {canEdit ? (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">
            Layer order
          </div>
          <div className="grid grid-cols-4 gap-1">
            <ZBtn label="To back" onClick={() => onChangeZ("back")} icon={<ChevronsDown size={12} />} />
            <ZBtn label="Backward" onClick={() => onChangeZ("backward")} icon={<ChevronDown size={12} />} />
            <ZBtn label="Forward" onClick={() => onChangeZ("forward")} icon={<ChevronUp size={12} />} />
            <ZBtn label="To front" onClick={() => onChangeZ("front")} icon={<ChevronsUp size={12} />} />
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <button
          onClick={onDelete}
          className="text-xs text-measure underline underline-offset-4 hover:no-underline"
        >
          Delete item
        </button>
      ) : null}
    </div>
  );
}

function ZBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex h-8 flex-col items-center justify-center rounded border border-border bg-panel-muted text-[9px] hover:bg-panel"
    >
      {icon}
    </button>
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

const PRESET_STROKE = ["#1c1917", "#dc2626", "#0891b2", "#16a34a", "#7c3aed", "#d97706"];
const PRESET_FILL = [null, "#ffffff", "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#1c1917"];

function ShapeProperties({
  shape,
  canEdit,
  onUpdate,
  onDelete,
}: {
  shape: Shape;
  canEdit: boolean;
  onUpdate: (patch: Partial<Shape>) => void;
  onDelete: () => void;
}) {
  const editable = canEdit && !shape.locked;
  const isText = shape.kind === "text";

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium capitalize">{shape.kind}</div>
        {canEdit ? (
          <button
            onClick={() => onUpdate({ locked: !shape.locked })}
            className={`flex h-7 items-center gap-1 rounded border px-2 text-xs ${
              shape.locked
                ? "border-ink bg-ink text-white"
                : "border-border bg-panel-muted text-ink-muted hover:text-ink"
            }`}
          >
            {shape.locked ? "Locked" : "Lock"}
          </button>
        ) : null}
      </div>

      {isText ? (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">Text</div>
          <textarea
            value={shape.text || ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            disabled={!editable}
            rows={2}
            placeholder="Type text…"
            className="w-full rounded-md border border-border bg-panel-muted px-2 py-1.5 text-sm outline-none focus:border-ink"
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">Size</div>
              <select
                disabled={!editable}
                value={shape.style?.size || 24}
                onChange={(e) =>
                  onUpdate({
                    style: { ...(shape.style || {}), size: parseInt(e.target.value, 10) },
                  })
                }
                className="h-8 w-full rounded-md border border-border bg-panel px-1 text-xs"
              >
                {[12, 14, 16, 20, 24, 32, 48, 64, 96].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">Font</div>
              <select
                disabled={!editable}
                value={shape.style?.font || "Inter"}
                onChange={(e) =>
                  onUpdate({ style: { ...(shape.style || {}), font: e.target.value } })
                }
                className="h-8 w-full rounded-md border border-border bg-panel px-1 text-xs"
              >
                {["Inter", "Fraunces", "JetBrains Mono", "Caveat"].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-1">
              <button
                disabled={!editable}
                onClick={() => onUpdate({ style: { ...(shape.style || {}), bold: !shape.style?.bold } })}
                className={`h-8 flex-1 rounded-md border text-xs font-bold ${
                  shape.style?.bold ? "border-ink bg-ink text-white" : "border-border bg-panel-muted"
                }`}
              >
                B
              </button>
              <button
                disabled={!editable}
                onClick={() => onUpdate({ style: { ...(shape.style || {}), italic: !shape.style?.italic } })}
                className={`h-8 flex-1 rounded-md border text-xs italic ${
                  shape.style?.italic ? "border-ink bg-ink text-white" : "border-border bg-panel-muted"
                }`}
              >
                I
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">
          {isText ? "Text colour" : "Outline"}
        </div>
        <div className="flex items-center gap-1.5">
          {PRESET_STROKE.map((c) => {
            const cur = isText ? shape.style?.color || shape.stroke : shape.stroke;
            return (
              <button
                key={c}
                disabled={!editable}
                onClick={() =>
                  onUpdate(
                    isText
                      ? { style: { ...(shape.style || {}), color: c } }
                      : { stroke: c },
                  )
                }
                className={`size-6 rounded-full border ${
                  cur === c ? "border-ink ring-2 ring-ink/20" : "border-border"
                }`}
                style={{ background: c }}
              />
            );
          })}
        </div>
      </div>

      {!isText ? (
        <>
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-faint">
              <span>Stroke width</span>
              <span className="font-num">{shape.stroke_width}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={shape.stroke_width}
              disabled={!editable}
              onChange={(e) => onUpdate({ stroke_width: parseFloat(e.target.value) })}
              className="w-full accent-ink"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-faint">
              <span>Outline opacity</span>
              <span className="font-num">{Math.round((shape.stroke_opacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={shape.stroke_opacity ?? 1}
              disabled={!editable}
              onChange={(e) => onUpdate({ stroke_opacity: parseFloat(e.target.value) })}
              className="w-full accent-ink"
            />
          </div>
        </>
      ) : null}

      {shape.kind === "rect" ? (
        <>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-faint">Fill</div>
            <div className="flex items-center gap-1.5">
              {PRESET_FILL.map((c, i) => (
                <button
                  key={i}
                  disabled={!editable}
                  onClick={() => onUpdate({ fill: c })}
                  className={`size-6 rounded-full border ${
                    shape.fill === c ? "border-ink ring-2 ring-ink/20" : "border-border"
                  }`}
                  style={{
                    background: c || "transparent",
                    backgroundImage: c
                      ? undefined
                      : "linear-gradient(45deg, transparent 47.5%, #dc2626 47.5%, #dc2626 52.5%, transparent 52.5%)",
                  }}
                  title={c || "No fill"}
                />
              ))}
            </div>
          </div>
          {shape.fill ? (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-faint">
                <span>Fill opacity</span>
                <span className="font-num">{Math.round((shape.fill_opacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={shape.fill_opacity ?? 1}
                disabled={!editable}
                onChange={(e) => onUpdate({ fill_opacity: parseFloat(e.target.value) })}
                className="w-full accent-ink"
              />
            </div>
          ) : null}
        </>
      ) : null}

      {canEdit ? (
        <button
          onClick={onDelete}
          className="text-xs text-measure underline underline-offset-4 hover:no-underline"
        >
          Delete shape
        </button>
      ) : null}
    </div>
  );
}
