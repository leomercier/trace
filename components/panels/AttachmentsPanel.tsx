"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, ExternalLink, Trash2, X, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/supabase/types";

/**
 * Attachments dialog. Controlled by `open` from the parent (the Toolbar's
 * overflow menu button). Reports the live count via `onCountChange` so the
 * toolbar badge stays current.
 */
export function AttachmentsPanel({
  pageId,
  orgId,
  projectId,
  canEdit,
  open,
  onClose,
  onCountChange,
}: {
  pageId: string;
  orgId: string;
  projectId: string;
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  onCountChange?: (n: number) => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("page_id", pageId)
      .order("uploaded_at", { ascending: false });
    const next = (data || []) as Attachment[];
    setItems(next);
    onCountChange?.(next.length);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  async function onUpload(file: File) {
    const id = crypto.randomUUID();
    const path = `${orgId}/${projectId}/${pageId}/${id}/${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }
    await supabase.from("attachments").insert({
      id,
      page_id: pageId,
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    });
    refresh();
  }

  async function onDelete(a: Attachment) {
    if (!confirm("Delete this attachment?")) return;
    await supabase.storage.from("attachments").remove([a.storage_path]);
    await supabase.from("attachments").delete().eq("id", a.id);
    refresh();
  }

  async function openAttachment(a: Attachment) {
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrl(a.storage_path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-30 flex items-end justify-center bg-black/30 backdrop-blur-sm md:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-lg border border-border bg-panel shadow-lg md:rounded-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Paperclip size={14} />
            <h2 className="font-serif text-base">Attachments</h2>
            <span className="font-num text-xs text-ink-faint">{items.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel-muted px-3 text-xs hover:bg-panel"
                title="Upload"
              >
                <Upload size={12} /> Upload
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-ink-muted">
              No attachments yet.
              {canEdit ? (
                <p className="mt-1 text-[11px]">
                  Upload spec sheets, photos, or any reference file.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-2 hover:bg-panel-muted"
                >
                  <button
                    onClick={() => openAttachment(a)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  >
                    <ExternalLink size={13} className="shrink-0 text-ink-faint" />
                    <span className="truncate">{a.file_name}</span>
                  </button>
                  {canEdit ? (
                    <button
                      onClick={() => onDelete(a)}
                      className="rounded p-1 text-ink-faint hover:bg-panel hover:text-measure"
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}
