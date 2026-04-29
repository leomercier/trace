"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  FileText,
  Layers,
  X,
  Lock,
  Unlock,
  FilePlus,
  Check,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { useEditor } from "@/stores/editorStore";

interface PageRow {
  id: string;
  name: string;
}

/**
 * Layers panel. On desktop it's a docked left sidebar; on mobile it's a
 * slide-over from the left, controlled by `mobileOpen` / `onMobileClose`.
 *
 * Sections:
 *   • Pages       — switch between pages of the project, add new, jump up
 *                   to the project / workspace, open workspace settings.
 *   • Drawings    — per-drawing visibility, lock, delete; click selects.
 */
export function LayersPanel({
  canEdit,
  canAdmin,
  mobileOpen,
  onMobileClose,
  onUpload,
  onSetVisible,
  onSetLocked,
  onSelect,
  onDelete,
  // Page nav
  orgSlug,
  projectId,
  projectName,
  currentPageId,
  pages,
  onNewPage,
  onDeletePage,
}: {
  canEdit: boolean;
  canAdmin?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onUpload: (f: File) => void;
  onSetVisible: (id: string, visible: boolean) => void;
  onSetLocked?: (id: string, locked: boolean) => void;
  onSelect?: (id: string) => void;
  onDelete: (id: string) => void;
  orgSlug?: string;
  projectId?: string;
  projectName?: string;
  currentPageId?: string;
  pages?: PageRow[];
  onNewPage?: () => Promise<void> | void;
  onDeletePage?: (id: string) => void;
}) {
  const drawings = useEditor((s) => s.drawings);
  const selection = useEditor((s) => s.selection);
  const [open, setOpen] = useState(true);

  const drawingList = Object.values(drawings).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const Body = (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-faint">
          <Layers size={13} /> Workspace
        </div>
        {onMobileClose ? (
          <button
            onClick={onMobileClose}
            className="rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink md:hidden"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="hidden text-xs text-ink-faint hover:text-ink md:inline"
            title={open ? "Collapse" : "Expand"}
          >
            {open ? "—" : "+"}
          </button>
        )}
      </div>

      {(open || mobileOpen) ? (
        <div className="space-y-5 p-3">
          {orgSlug && pages ? (
            <PagesSection
              orgSlug={orgSlug}
              projectId={projectId}
              projectName={projectName}
              currentPageId={currentPageId}
              pages={pages}
              canEdit={canEdit}
              canAdmin={!!canAdmin}
              onNewPage={onNewPage}
              onDeletePage={onDeletePage}
              onMobileClose={onMobileClose}
            />
          ) : null}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">
                Drawings
              </div>
              {canEdit ? (
                <label
                  title="Add a layer"
                  className="flex h-7 cursor-pointer items-center gap-1 rounded text-xs text-ink-muted hover:text-ink"
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
              ) : null}
            </div>
            {drawingList.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-ink-muted">
                No drawings yet.
                {canEdit ? (
                  <span className="mt-1 block text-[10px]">
                    Drop a file or tap + to add one.
                  </span>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-1">
                {drawingList.map((d) => {
                  const selected =
                    selection?.kind === "drawing" && selection.id === d.id;
                  return (
                    <li
                      key={d.id}
                      className={`group flex items-center gap-2 rounded px-2 py-2 text-sm ${
                        selected
                          ? "bg-panel-muted ring-1 ring-ink/20"
                          : "hover:bg-panel-muted"
                      }`}
                    >
                      <button
                        onClick={() => onSetVisible(d.id, !d.visible)}
                        title={d.visible ? "Hide" : "Show"}
                        className="text-ink-muted hover:text-ink"
                      >
                        {d.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <FileText size={12} className="shrink-0 text-ink-faint" />
                      <button
                        type="button"
                        onClick={() => onSelect?.(d.id)}
                        title="Select drawing"
                        className={`min-w-0 flex-1 truncate text-left ${
                          d.visible ? "text-ink" : "text-ink-faint"
                        }`}
                      >
                        {d.name}
                      </button>
                      <span className="font-num text-[10px] uppercase text-ink-faint">
                        {d.fileType}
                      </span>
                      {canEdit && onSetLocked ? (
                        <button
                          onClick={() => onSetLocked(d.id, !d.locked)}
                          title={d.locked ? "Unlock" : "Lock"}
                          className={
                            d.locked
                              ? "text-ink"
                              : "opacity-60 hover:opacity-100"
                          }
                        >
                          {d.locked ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                      ) : null}
                      {canEdit ? (
                        <button
                          onClick={() => {
                            if (d.locked) return;
                            if (confirm(`Delete layer "${d.name}"?`)) onDelete(d.id);
                          }}
                          disabled={d.locked}
                          className="opacity-100 disabled:opacity-30 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                          title={d.locked ? "Unlock to delete" : "Delete layer"}
                        >
                          <Trash2 size={13} className="text-ink-faint hover:text-measure" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {/* Desktop dock */}
      <aside
        className={`hidden shrink-0 flex-col overflow-y-auto border-r border-border bg-panel md:flex ${
          open ? "w-64" : "w-12"
        }`}
      >
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

function PagesSection({
  orgSlug,
  projectId,
  projectName,
  currentPageId,
  pages,
  canEdit,
  canAdmin,
  onNewPage,
  onDeletePage,
  onMobileClose,
}: {
  orgSlug: string;
  projectId?: string;
  projectName?: string;
  currentPageId?: string;
  pages: PageRow[];
  canEdit: boolean;
  canAdmin: boolean;
  onNewPage?: () => Promise<void> | void;
  onDeletePage?: (id: string) => void;
  onMobileClose?: () => void;
}) {
  const router = useRouter();

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-ink-faint">
          Pages
        </div>
        {canEdit && onNewPage ? (
          <button
            onClick={async () => {
              await onNewPage();
              onMobileClose?.();
            }}
            title="New page"
            className="flex h-7 items-center gap-1 rounded text-xs text-ink-muted hover:text-ink"
          >
            <FilePlus size={13} /> New
          </button>
        ) : null}
      </div>

      {projectName && projectId ? (
        <Link
          href={`/app/${orgSlug}/${projectId}`}
          onClick={onMobileClose}
          className="mb-2 flex items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-muted hover:bg-panel-muted hover:text-ink"
        >
          <ArrowLeft size={12} />
          <span className="truncate">{projectName}</span>
        </Link>
      ) : null}

      <ul className="max-h-56 space-y-0.5 overflow-y-auto">
        {pages.map((p) => {
          const isCurrent = p.id === currentPageId;
          return (
            <li key={p.id} className="group flex items-center gap-1">
              <button
                onClick={() => {
                  if (!isCurrent && projectId) {
                    router.push(`/app/${orgSlug}/${projectId}/${p.id}`);
                  }
                  onMobileClose?.();
                }}
                className={`flex flex-1 items-center gap-2 truncate rounded px-2 py-1.5 text-left text-sm ${
                  isCurrent
                    ? "bg-panel-muted text-ink"
                    : "text-ink-muted hover:bg-panel-muted hover:text-ink"
                }`}
              >
                {isCurrent ? (
                  <Check size={12} className="shrink-0 text-ink" />
                ) : (
                  <span className="w-3 shrink-0" />
                )}
                <span className="truncate">{p.name}</span>
              </button>
              {canEdit && onDeletePage && pages.length > 1 ? (
                <button
                  onClick={() => {
                    if (confirm(`Delete page "${p.name}"? This cannot be undone.`)) {
                      onDeletePage(p.id);
                    }
                  }}
                  title="Delete page"
                  className="rounded p-1 text-ink-faint opacity-0 hover:bg-panel hover:text-measure md:group-hover:opacity-100"
                >
                  <Trash2 size={11} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canAdmin ? (
        <Link
          href={`/app/${orgSlug}/settings`}
          onClick={onMobileClose}
          className="mt-3 flex items-center gap-2 rounded px-2 py-1.5 text-xs text-ink-muted hover:bg-panel-muted hover:text-ink"
        >
          <Settings size={12} />
          Workspace settings
        </Link>
      ) : null}
    </section>
  );
}
