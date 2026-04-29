"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Check, Plus, ChevronLeft, Settings, LogOut, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PageRow {
  id: string;
  name: string;
}

export function PageMenu({
  orgSlug,
  projectId,
  projectName,
  currentPageId,
  pages: initialPages,
  canEdit,
  canAdmin,
  onDeletePage,
}: {
  orgSlug: string;
  projectId: string;
  projectName: string;
  currentPageId: string;
  pages: PageRow[];
  canEdit: boolean;
  canAdmin: boolean;
  onDeletePage?: (id: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState(initialPages);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [open]);

  async function newPage() {
    const { data, error } = await supabase
      .from("pages")
      .insert({ project_id: projectId, name: `Page ${pages.length + 1}` })
      .select("id, name")
      .single();
    if (error || !data) return;
    setPages([...pages, data]);
    router.push(`/app/${orgSlug}/${projectId}/${data.id}`);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-panel hover:border-border-strong"
      >
        <Menu size={16} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-md border border-border bg-panel shadow-lg">
          <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-ink-faint">
            {projectName}
          </div>
          <Link
            href={`/app/${orgSlug}/${projectId}`}
            className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-panel-muted"
            onClick={() => setOpen(false)}
          >
            <ChevronLeft size={14} className="text-ink-muted" />
            Back to project
          </Link>
          <Link
            href={`/app/${orgSlug}`}
            className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-panel-muted"
            onClick={() => setOpen(false)}
          >
            <ChevronLeft size={14} className="text-ink-muted" />
            All projects
          </Link>
          {canAdmin ? (
            <Link
              href={`/app/${orgSlug}/settings`}
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-panel-muted"
              onClick={() => setOpen(false)}
            >
              <Settings size={14} className="text-ink-muted" />
              Workspace settings
            </Link>
          ) : null}

          <div className="border-t border-border" />
          <div className="px-3 pt-3 text-[11px] uppercase tracking-wider text-ink-faint">
            Pages
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {pages.map((p) => (
              <li key={p.id} className="group flex items-center gap-1 pr-2">
                <Link
                  href={`/app/${orgSlug}/${projectId}/${p.id}`}
                  onClick={() => setOpen(false)}
                  className="flex flex-1 items-center gap-2 px-3 py-2 text-sm hover:bg-panel-muted"
                >
                  {p.id === currentPageId ? (
                    <Check size={14} className="text-ink" />
                  ) : (
                    <span className="w-[14px]" />
                  )}
                  <span className="truncate">{p.name}</span>
                </Link>
                {canEdit && onDeletePage && pages.length > 1 ? (
                  <button
                    onClick={() => {
                      if (confirm(`Delete page "${p.name}"? This cannot be undone.`)) {
                        onDeletePage(p.id);
                        setPages(pages.filter((x) => x.id !== p.id));
                        setOpen(false);
                      }
                    }}
                    title="Delete page"
                    className="rounded p-1 text-ink-faint opacity-0 hover:bg-panel hover:text-measure group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {canEdit ? (
            <button
              onClick={() => {
                setOpen(false);
                newPage();
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-ink hover:bg-panel-muted"
            >
              <Plus size={14} />
              New page
            </button>
          ) : null}

          <div className="border-t border-border" />
          <button
            onClick={async () => {
              setOpen(false);
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-panel-muted"
          >
            <LogOut size={14} className="text-ink-muted" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
