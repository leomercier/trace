"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2, FileText, Layers } from "lucide-react";
import { useEditor } from "@/stores/editorStore";

/**
 * Left-side layers panel. Lists all imported drawings (legacy primary +
 * page_drawings) with show/hide toggles. Has a quick "+ Add layer" button
 * that triggers a hidden file input, hooked up to the parent Editor's
 * upload handler.
 */
export function LayersPanel({
  canEdit,
  onUpload,
  onSetVisible,
  onDelete,
}: {
  canEdit: boolean;
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

  return (
    <aside
      className={`hidden shrink-0 border-r border-border bg-panel md:block ${
        open ? "w-60" : "w-12"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-faint hover:text-ink"
          title={open ? "Collapse" : "Expand"}
        >
          <Layers size={13} /> {open ? "Layers" : ""}
        </button>
      </div>

      {open ? (
        <div className="space-y-4 p-3">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-ink-faint">
                Drawings
              </div>
              {canEdit ? (
                <label
                  title="Add a layer"
                  className="flex h-6 cursor-pointer items-center gap-1 rounded text-xs text-ink-muted hover:text-ink"
                >
                  <Plus size={12} />
                  <input
                    type="file"
                    className="hidden"
                    accept=".dwg,.dxf,.pdf,.svg,.png,.jpg,.jpeg"
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
                    Drop a file or click + to add one.
                  </span>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-1">
                {drawingList.map((d) => (
                  <li
                    key={d.id}
                    className="group flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-panel-muted"
                  >
                    <button
                      onClick={() => onSetVisible(d.id, !d.visible)}
                      title={d.visible ? "Hide" : "Show"}
                      className="text-ink-muted hover:text-ink"
                    >
                      {d.visible ? <Eye size={13} /> : <EyeOff size={13} />}
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
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        title="Delete layer"
                      >
                        <Trash2 size={12} className="text-ink-faint hover:text-measure" />
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
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-panel-muted"
                >
                  <button
                    onClick={() => toggleLayer(k)}
                    className="text-ink-muted hover:text-ink"
                  >
                    {layers[k] ? <Eye size={13} /> : <EyeOff size={13} />}
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
    </aside>
  );
}
