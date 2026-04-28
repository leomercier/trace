"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Upload, ExternalLink, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/supabase/types";

export function AttachmentsPanel({
  pageId,
  orgId,
  projectId,
  canEdit,
}: {
  pageId: string;
  orgId: string;
  projectId: string;
  canEdit: boolean;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<Attachment[]>([]);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("page_id", pageId)
      .order("uploaded_at", { ascending: false });
    setItems((data || []) as Attachment[]);
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

  return (
    <div className="pointer-events-auto fixed bottom-20 right-4 z-20 md:bottom-4">
      {open ? (
        <div className="mb-2 w-72 rounded-md border border-border bg-panel p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-ink-faint">
              Attachments
            </div>
            {canEdit ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded border border-border bg-panel-muted p-1.5 text-xs hover:bg-panel"
                title="Upload"
              >
                <Upload size={12} />
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <div className="text-sm text-ink-muted">No attachments yet.</div>
          ) : (
            <ul className="space-y-1">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-panel-muted"
                >
                  <button
                    onClick={() => openAttachment(a)}
                    className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm"
                  >
                    <ExternalLink size={12} className="shrink-0 text-ink-faint" />
                    <span className="truncate">{a.file_name}</span>
                  </button>
                  {canEdit ? (
                    <button
                      onClick={() => onDelete(a)}
                      className="text-ink-faint hover:text-measure"
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
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
      ) : null}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-1.5 rounded-md border border-border bg-panel px-3 text-sm shadow-sm hover:border-border-strong"
      >
        <Paperclip size={14} /> {items.length}
      </button>
    </div>
  );
}
