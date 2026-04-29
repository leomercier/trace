"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  FileText,
  Layers,
  X,
  Image as ImageIcon,
  Square,
  Type,
  StickyNote,
  Package,
  Minus,
} from "lucide-react";
import { useEditor } from "@/stores/editorStore";
import type { Note, PlacedItem, Shape } from "@/lib/supabase/types";
import { PageMenu } from "./PageMenu";

interface PageRow {
  id: string;
  name: string;
}

/**
 * Layers panel. On desktop it's a docked left sidebar; on mobile it's a
 * slide-over from the left, controlled by `mobileOpen` / `onMobileClose`.
 *
 * Lists every asset type on the page — drawings, placed items, shapes,
 * notes — under one panel. Each row is selectable (sets selection on the
 * canvas) and deletable. Per-category visibility lives next to each
 * section header.
 */
export function LayersPanel({
  canEdit,
  mobileOpen,
  onMobileClose,
  onUpload,
  onSetVisible,
  onSetLocked,
  onDelete,
  onDeletePlacedItem,
  onDeleteShape,
  onDeleteNote,
  page,
}: {
  canEdit: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onUpload: (f: File) => void;
  onSetVisible: (id: string, visible: boolean) => void;
  /** Persist lock state on a drawing layer. Pass undefined for "primary". */
  onSetLocked: (id: string, locked: boolean) => void;
  onDelete: (id: string) => void;
  onDeletePlacedItem: (id: string) => void;
  onDeleteShape: (id: string) => void;
  onDeleteNote: (id: string) => void;
  page: {
    orgSlug: string;
    projectId: string;
    projectName: string;
    currentPageId: string;
    currentPageName: string;
    pages: PageRow[];
    canAdmin: boolean;
    onDeletePage?: (id: string) => void;
    onRenamePage: (name: string) => void;
  };
}) {
  const drawings = useEditor((s) => s.drawings);
  const placedItems = useEditor((s) => s.placedItems);
  const shapes = useEditor((s) => s.shapes);
  const notes = useEditor((s) => s.notes);
  const layers = useEditor((s) => s.layers);
  const toggleLayer = useEditor((s) => s.toggleLayer);
  const selection = useEditor((s) => s.selection);
  const setSelection = useEditor((s) => s.setSelection);

  const drawingList = Object.values(drawings).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const itemList = Object.values(placedItems).sort(
    (a, b) =>
      Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const shapeList = Object.values(shapes).sort(
    (a, b) =>
      Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const noteList = Object.values(notes).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const Body = (
    <>
      {/* Page menu + page name (moved from the top bar). */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <PageMenu
          orgSlug={page.orgSlug}
          projectId={page.projectId}
          projectName={page.projectName}
          currentPageId={page.currentPageId}
          pages={page.pages}
          canEdit={canEdit}
          canAdmin={page.canAdmin}
          onDeletePage={page.onDeletePage}
        />
        <PageNameField
          name={page.currentPageName}
          canEdit={canEdit}
          onRename={page.onRenamePage}
        />
        {onMobileClose ? (
          <button
            onClick={onMobileClose}
            className="rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink md:hidden"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-faint">
          <Layers size={13} /> Layers
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {/* Drawings */}
          <Section
            title="Drawings"
            count={drawingList.length}
            visible={true /* drawings live outside `layers` toggles */}
            empty={
              <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-ink-muted">
                No drawings yet.
                {canEdit ? (
                  <span className="mt-1 block text-[10px]">
                    Drop a file or tap + to add one.
                  </span>
                ) : null}
              </div>
            }
            action={
              canEdit ? (
                <label
                  title="Add a layer"
                  className="flex h-7 cursor-pointer items-center gap-1 rounded px-1 text-xs text-ink-muted hover:text-ink"
                  aria-label="Add drawing"
                >
                  <Plus size={14} />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              ) : null
            }
          >
            {drawingList.map((d) => {
              const isSelected =
                selection?.kind === "drawing" && selection.id === d.id;
              return (
                <Row
                  key={d.id}
                  selected={isSelected}
                  visible={d.visible}
                  onToggleVisible={() => onSetVisible(d.id, !d.visible)}
                  locked={d.locked}
                  onToggleLocked={
                    canEdit && d.id !== "primary"
                      ? () => onSetLocked(d.id, !d.locked)
                      : undefined
                  }
                  onSelect={() => setSelection({ kind: "drawing", id: d.id })}
                  onDelete={
                    canEdit
                      ? () => {
                          if (confirm(`Delete layer "${d.name}"?`)) onDelete(d.id);
                        }
                      : undefined
                  }
                  icon={<FileText size={12} />}
                  label={d.name}
                  badge={d.fileType.toUpperCase()}
                />
              );
            })}
          </Section>

          {/* Placed inventory items */}
          <Section
            title="Items"
            count={itemList.length}
            visible={layers.items}
            onToggleVisible={() => toggleLayer("items")}
          >
            {itemList.map((p) => (
              <Row
                key={p.id}
                selected={selection?.kind === "placed" && selection.id === p.id}
                onSelect={() => setSelection({ kind: "placed", id: p.id })}
                onDelete={canEdit ? () => onDeletePlacedItem(p.id) : undefined}
                icon={<Package size={12} />}
                label={p.name}
                badge={`${p.width_mm}×${p.depth_mm}`}
              />
            ))}
          </Section>

          {/* Shapes (line / rect / text) */}
          <Section
            title="Shapes"
            count={shapeList.length}
            visible={layers.shapes}
            onToggleVisible={() => toggleLayer("shapes")}
          >
            {shapeList.map((s) => (
              <Row
                key={s.id}
                selected={selection?.kind === "shape" && selection.id === s.id}
                onSelect={() => setSelection({ kind: "shape", id: s.id })}
                onDelete={canEdit ? () => onDeleteShape(s.id) : undefined}
                icon={shapeIcon(s)}
                label={shapeLabel(s)}
                badge={s.kind.toUpperCase()}
              />
            ))}
          </Section>

          {/* Sticky notes */}
          <Section
            title="Notes"
            count={noteList.length}
            visible={layers.notes}
            onToggleVisible={() => toggleLayer("notes")}
          >
            {noteList.map((n) => (
              <Row
                key={n.id}
                selected={selection?.kind === "note" && selection.id === n.id}
                onSelect={() => setSelection({ kind: "note", id: n.id })}
                onDelete={canEdit ? () => onDeleteNote(n.id) : undefined}
                icon={<StickyNote size={12} />}
                label={n.text || "Empty note"}
              />
            ))}
          </Section>
        </div>
    </>
  );

  return (
    <>
      {/* Desktop dock */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-panel md:flex">
        {Body}
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden" onClick={onMobileClose}>
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden
          />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-panel shadow-lg"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {Body}
          </aside>
        </div>
      ) : null}
    </>
  );
}

function Section({
  title,
  count,
  visible,
  onToggleVisible,
  action,
  empty,
  children,
}: {
  title: string;
  count: number;
  visible: boolean;
  onToggleVisible?: () => void;
  action?: React.ReactNode;
  empty?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {onToggleVisible ? (
            <button
              onClick={onToggleVisible}
              title={visible ? `Hide ${title.toLowerCase()}` : `Show ${title.toLowerCase()}`}
              className="text-ink-muted hover:text-ink"
              aria-label={`Toggle ${title} visibility`}
            >
              {visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          ) : (
            <span className="size-3" />
          )}
          <div className="text-[10px] uppercase tracking-wider text-ink-faint">
            {title}
          </div>
          {count > 0 ? (
            <span className="font-num text-[10px] text-ink-faint">·{count}</span>
          ) : null}
        </div>
        {action}
      </div>
      {count === 0 ? empty || null : (
        <ul className="space-y-0.5">{children}</ul>
      )}
    </section>
  );
}

function Row({
  selected,
  visible,
  onToggleVisible,
  locked,
  onToggleLocked,
  onSelect,
  onDelete,
  icon,
  label,
  badge,
}: {
  selected: boolean;
  visible?: boolean;
  onToggleVisible?: () => void;
  locked?: boolean;
  onToggleLocked?: () => void;
  onSelect: () => void;
  onDelete?: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <li
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${
        selected ? "bg-panel-muted ring-1 ring-ink/20" : "hover:bg-panel-muted"
      }`}
    >
      {onToggleVisible ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
          title={visible ? "Hide" : "Show"}
          className="text-ink-muted hover:text-ink"
        >
          {visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      ) : null}
      <span className="shrink-0 text-ink-faint">{icon}</span>
      <span
        className={`min-w-0 flex-1 truncate ${
          visible === false ? "text-ink-faint" : ""
        }`}
        title={label}
      >
        {label}
      </span>
      {badge ? (
        <span className="font-num text-[10px] uppercase text-ink-faint">
          {badge}
        </span>
      ) : null}
      {onToggleLocked ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLocked();
          }}
          title={locked ? "Unlock" : "Lock"}
          aria-label={locked ? "Unlock" : "Lock"}
          className={`text-ink-muted hover:text-ink ${
            locked ? "opacity-100" : "opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
          }`}
        >
          {locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      ) : null}
      {onDelete ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
          title="Delete"
          aria-label="Delete"
        >
          <Trash2 size={13} className="text-ink-faint hover:text-measure" />
        </button>
      ) : null}
    </li>
  );
}

function shapeIcon(s: Shape): React.ReactNode {
  if (s.kind === "rect") return <Square size={12} />;
  if (s.kind === "text") return <Type size={12} />;
  return <Minus size={12} />;
}

function shapeLabel(s: Shape): string {
  if (s.kind === "text") return s.text?.trim() || "Text";
  if (s.kind === "rect") return "Rectangle";
  return "Line";
}

function PageNameField({
  name,
  canEdit,
  onRename,
}: {
  name: string;
  canEdit: boolean;
  onRename: (n: string) => void;
}) {
  const [value, setValue] = useState(name);
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value && value !== name) onRename(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
      disabled={!canEdit}
      className="min-w-0 flex-1 truncate bg-transparent font-serif text-base outline-none disabled:text-ink-muted"
      placeholder="Untitled page"
      title={canEdit ? "Rename page" : name}
    />
  );
}
