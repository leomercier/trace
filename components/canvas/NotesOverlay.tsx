"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Trash2, Type } from "lucide-react";
import { useEditor } from "@/stores/editorStore";
import type { Note, NoteStyle } from "@/lib/supabase/types";

const NOTE_BG_PRESETS = [
  "#fef3c7", // cream (default)
  "#fde68a", // amber
  "#fecaca", // pink
  "#bbf7d0", // green
  "#bae6fd", // blue
  "#e9d5ff", // lavender
  "#f3f4f6", // grey
  "#ffffff", // white
];

const TEXT_COLOR_PRESETS = ["#1c1917", "#dc2626", "#0891b2", "#16a34a", "#7c3aed", "#ffffff"];

const FONT_PRESETS = [
  { id: "Caveat", label: "Caveat", style: "var(--font-hand), cursive" },
  { id: "Inter", label: "Sans", style: "var(--font-sans), sans-serif" },
  { id: "Fraunces", label: "Serif", style: "var(--font-serif), serif" },
  { id: "JetBrains Mono", label: "Mono", style: "var(--font-mono), monospace" },
];

const SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 36];

function styleOf(n: Note): NoteStyle {
  return n.style || {};
}

function getFontStack(name?: string) {
  return FONT_PRESETS.find((f) => f.id === name)?.style || "var(--font-hand), cursive";
}

export function NotesOverlay({
  canEdit,
  onUpdate,
  onDelete,
}: {
  canEdit: boolean;
  onUpdate: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  const view = useEditor((s) => s.view);
  const notes = useEditor((s) => s.notes);
  const layers = useEditor((s) => s.layers);
  const selection = useEditor((s) => s.selection);
  const setSelection = useEditor((s) => s.setSelection);
  if (!layers.notes) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.values(notes).map((n) => (
        <StickyNote
          key={n.id}
          n={n}
          view={view}
          canEdit={canEdit}
          selected={selection?.kind === "note" && selection.id === n.id}
          onSelect={() => setSelection({ kind: "note", id: n.id })}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function StickyNote({
  n,
  view,
  canEdit,
  selected,
  onSelect,
  onUpdate,
  onDelete,
}: {
  n: Note;
  view: { x: number; y: number; zoom: number };
  canEdit: boolean;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(n.text);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(
    null,
  );
  const resizeRef = useRef<{ startW: number; startH: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    setText(n.text);
  }, [n.text]);

  // POSITION uses world→screen so notes stay attached to the canvas.
  // SIZE is screen-fixed so notes don't shrink at low zoom (the previous
  // behaviour was responsible for the "letters wrapping vertically" bug).
  const sx = +n.x * view.zoom + view.x;
  const sy = +n.y * view.zoom + view.y;
  const sw = Math.max(120, +n.w);
  const sh = Math.max(60, +n.h);

  const style = styleOf(n);
  const bg = style.bg || n.color || "#fef3c7";
  const textColor = style.color || "#1c1917";
  const fontStack = getFontStack(style.font);
  const size = style.size || 16;
  const weight = style.bold ? 600 : 400;
  const italic = style.italic ? "italic" : "normal";

  function setStyle(patch: NoteStyle) {
    onUpdate({ ...n, style: { ...style, ...patch } });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!canEdit || editing) return;
    const target = e.target as HTMLElement;
    if (target.dataset.role === "text" || target.closest("[data-role=toolbar]")) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    dragRef.current = {
      dx: e.clientX - sx,
      dy: e.clientY - sy,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    const newSx = e.clientX - dragRef.current.dx;
    const newSy = e.clientY - dragRef.current.dy;
    const wx = (newSx - view.x) / view.zoom;
    const wy = (newSy - view.y) / view.zoom;
    onUpdate({ ...n, x: wx as any, y: wy as any });
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function onResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startW: sw, startH: sh, sx: e.clientX, sy: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizeRef.current) return;
    const newW = Math.max(120, resizeRef.current.startW + (e.clientX - resizeRef.current.sx));
    const newH = Math.max(60, resizeRef.current.startH + (e.clientY - resizeRef.current.sy));
    onUpdate({ ...n, w: newW as any, h: newH as any });
  }
  function onResizePointerUp() {
    resizeRef.current = null;
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`pointer-events-auto absolute origin-top-left rounded-lg shadow-md transition-shadow ${
        selected ? "shadow-lg ring-2 ring-ink/20" : ""
      }`}
      style={{
        transform: `translate3d(${sx}px, ${sy}px, 0)`,
        width: sw,
        minHeight: sh,
        height: sh,
        background: bg,
        border: `1px solid rgba(0,0,0,0.06)`,
        cursor: canEdit ? (editing ? "text" : "grab") : "default",
        userSelect: editing ? "text" : "none",
      }}
      onDoubleClick={() => canEdit && setEditing(true)}
    >
      {selected && canEdit && !editing ? (
        <FormatToolbar
          style={style}
          onChangeStyle={setStyle}
          onDelete={() => onDelete(n.id)}
        />
      ) : null}

      <div
        className="h-full w-full overflow-hidden p-3"
        style={{
          color: textColor,
          fontFamily: fontStack,
          fontSize: size,
          fontWeight: weight,
          fontStyle: italic,
          lineHeight: 1.35,
        }}
      >
        {editing ? (
          <textarea
            autoFocus
            data-role="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (text !== n.text) onUpdate({ ...n, text });
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setText(n.text);
                setEditing(false);
              }
            }}
            className="block h-full w-full resize-none bg-transparent outline-none"
            style={{
              color: textColor,
              fontFamily: fontStack,
              fontSize: size,
              fontWeight: weight,
              fontStyle: italic,
              lineHeight: 1.35,
            }}
            placeholder="Type a note…"
          />
        ) : (
          <div data-role="text" className="whitespace-pre-wrap break-words">
            {n.text || (canEdit ? <span className="opacity-50">Double-click to edit</span> : null)}
          </div>
        )}
      </div>

      {canEdit && selected ? (
        <div
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          className="absolute -bottom-1 -right-1 size-4 cursor-nwse-resize rounded-sm border border-ink/30 bg-white"
          style={{ touchAction: "none" }}
        />
      ) : null}
    </div>
  );
}

function FormatToolbar({
  style,
  onChangeStyle,
  onDelete,
}: {
  style: NoteStyle;
  onChangeStyle: (patch: NoteStyle) => void;
  onDelete: () => void;
}) {
  const [showFont, setShowFont] = useState(false);

  return (
    <div
      data-role="toolbar"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute -top-12 left-0 flex items-center gap-1 rounded-md border border-border bg-panel p-1 text-ink shadow-md"
    >
      {/* Background colour swatches */}
      <div className="flex items-center gap-0.5 px-1">
        {NOTE_BG_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onChangeStyle({ bg: c })}
            className={`size-5 rounded-full border ${
              style.bg === c ? "border-ink" : "border-border"
            }`}
            style={{ background: c }}
            title="Background"
          />
        ))}
      </div>
      <div className="h-5 w-px bg-border" />

      {/* Font */}
      <div className="relative">
        <button
          onClick={() => setShowFont((v) => !v)}
          className="flex h-7 items-center gap-1 rounded px-2 text-xs hover:bg-panel-muted"
        >
          <Type size={12} /> Aa
        </button>
        {showFont ? (
          <div className="absolute left-0 top-full mt-1 w-40 rounded-md border border-border bg-panel p-1 shadow-md">
            <div className="mb-1 px-2 pt-1 text-[10px] uppercase tracking-wider text-ink-faint">
              Font
            </div>
            {FONT_PRESETS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onChangeStyle({ font: f.id });
                  setShowFont(false);
                }}
                className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-panel-muted ${
                  (style.font || "Caveat") === f.id ? "font-medium text-ink" : "text-ink-muted"
                }`}
                style={{ fontFamily: f.style }}
              >
                {f.label}
              </button>
            ))}
            <div className="mb-1 mt-2 px-2 text-[10px] uppercase tracking-wider text-ink-faint">
              Size
            </div>
            <div className="flex flex-wrap gap-1 px-1 pb-1">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onChangeStyle({ size: s });
                    setShowFont(false);
                  }}
                  className={`flex size-7 items-center justify-center rounded text-[11px] hover:bg-panel-muted ${
                    (style.size || 16) === s ? "bg-ink text-white hover:bg-ink" : ""
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <button
        onClick={() => onChangeStyle({ bold: !style.bold })}
        className={`flex h-7 w-7 items-center justify-center rounded hover:bg-panel-muted ${
          style.bold ? "bg-ink text-white hover:bg-ink" : ""
        }`}
        title="Bold"
      >
        <Bold size={12} />
      </button>
      <button
        onClick={() => onChangeStyle({ italic: !style.italic })}
        className={`flex h-7 w-7 items-center justify-center rounded hover:bg-panel-muted ${
          style.italic ? "bg-ink text-white hover:bg-ink" : ""
        }`}
        title="Italic"
      >
        <Italic size={12} />
      </button>
      <div className="h-5 w-px bg-border" />

      {/* Text colour */}
      <div className="flex items-center gap-0.5 px-1">
        {TEXT_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onChangeStyle({ color: c })}
            className={`size-4 rounded-full border ${
              style.color === c ? "border-ink ring-1 ring-ink/30" : "border-border"
            }`}
            style={{ background: c }}
            title="Text colour"
          />
        ))}
      </div>
      <div className="h-5 w-px bg-border" />

      <button
        onClick={onDelete}
        className="flex h-7 w-7 items-center justify-center rounded text-measure hover:bg-panel-muted"
        title="Delete note"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
