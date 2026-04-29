"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2, FileText, Layers, X } from "lucide-react";
import { useEditor } from "@/stores/editorStore";

/**
 * Layers panel. On desktop it's a docked left sidebar; on mobile it's a
 * slide-over from the left, controlled by `mobileOpen` / `onMobileClose`.
 */
export function LayersPanel({
  canEdit,
  mobileOpen,
  onMobileClose,
  onUpload,
  onSetVisible,
  onDelete,
}: {
  canEdit: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onUpload: (f: File) => void;
  onSetVisible: (id: string, visible: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const drawings = useEditor((s) => s.drawings);
  const layers = useEditor((s) => s.layers);
  const toggleLayer = useEditor((s) => s.toggleLayer);
  const [open, setOpen] = useState(true);

  const drawingList = Object.values(drawings).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const Body = (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-faint">
          <Layers size={13} /> Layers
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
        <div className="space-y-4 p-3">
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
                {drawingList.map((d) => (
                  <li
                    key={d.id}
                    className="group flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-panel-muted"
                  >
                    <button
                      onClick={() => onSetVisible(d.id, !d.visible)}
                      title={d.visible ? "Hide" : "Show"}
                      className="text-ink-muted hover:text-ink"
                    >
                      {d.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <FileText size={12} className="shrink-0 text-ink-faint" />
                    <span
                      className={`min-w-0 flex-1 truncate ${
                        d.visible ? "" : "text-ink-faint"
                      }`}
                      title={d.name}
                    >
                      {d.name}
                    </span>
                    <span className="font-num text-[10px] uppercase text-ink-faint">
                      {d.fileType}
                    </span>
                    {canEdit ? (
                      <button
                        onClick={() => {
                          if (confirm(`Delete layer "${d.name}"?`)) onDelete(d.id);
                        }}
                        className="opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                        title="Delete layer"
                      >
                        <Trash2 size={13} className="text-ink-faint hover:text-measure" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-faint">
              Annotations
            </div>
            <ul className="space-y-1">
              {(["measurements", "notes", "items", "cursors"] as const).map((k) => (
                <li
                  key={k}
                  className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-panel-muted"
                >
                  <button
                    onClick={() => toggleLayer(k)}
                    className="text-ink-muted hover:text-ink"
                  >
                    {layers[k] ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <span
                    className={`flex-1 capitalize ${
                      layers[k] ? "" : "text-ink-faint"
                    }`}
                  >
                    {k}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {/* Desktop dock */}
      <aside
        className={`hidden shrink-0 border-r border-border bg-panel md:block ${
          open ? "w-60" : "w-12"
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
