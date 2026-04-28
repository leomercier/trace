"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/stores/editorStore";
import type { Note } from "@/lib/supabase/types";

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
  if (!layers.notes) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.values(notes).map((n) => (
        <StickyNote
          key={n.id}
          n={n}
          view={view}
          canEdit={canEdit}
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
  onUpdate,
  onDelete,
}: {
  n: Note;
  view: { x: number; y: number; zoom: number };
  canEdit: boolean;
  onUpdate: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(n.text);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    setText(n.text);
  }, [n.text]);

  const sx = +n.x * view.zoom + view.x;
  const sy = +n.y * view.zoom + view.y;
  const sw = +n.w * view.zoom;
  const sh = +n.h * view.zoom;

  function onPointerDown(e: React.PointerEvent) {
    if (!canEdit || editing) return;
    if ((e.target as HTMLElement).dataset.role === "text") return;
    e.preventDefault();
    dragRef.current = {
      dx: e.clientX - sx,
      dy: e.clientY - sy,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const newSx = e.clientX - dragRef.current.dx;
    const newSy = e.clientY - dragRef.current.dy;
    const wx = (newSx - view.x) / view.zoom;
    const wy = (newSy - view.y) / view.zoom;
    onUpdate({ ...n, x: wx as any, y: wy as any });
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="pointer-events-auto absolute origin-top-left rounded-md font-hand text-base shadow-md"
      style={{
        transform: `translate3d(${sx}px, ${sy}px, 0)`,
        width: sw,
        minHeight: sh,
        background: n.color,
        border: "1px solid rgba(0,0,0,0.08)",
        cursor: canEdit ? (editing ? "text" : "grab") : "default",
        padding: 10,
        color: "#1c1917",
        userSelect: editing ? "text" : "none",
      }}
      onDoubleClick={() => canEdit && setEditing(true)}
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
          className="h-full w-full resize-none bg-transparent font-hand text-base text-ink outline-none"
          style={{ minHeight: sh - 20 }}
        />
      ) : (
        <div data-role="text" className="whitespace-pre-wrap break-words">
          {n.text || (canEdit ? <span className="text-ink-faint">Double-click to edit…</span> : null)}
        </div>
      )}
      {canEdit && !editing ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(n.id);
          }}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-ink text-white hover:flex"
          aria-label="Delete note"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
