"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Canvas, type CanvasHandle } from "@/components/canvas/Canvas";
import { NotesOverlay } from "@/components/canvas/NotesOverlay";
import { Toolbar } from "@/components/panels/Toolbar";
import { useEditor } from "@/stores/editorStore";
import { parseFile, inferFileType } from "@/components/canvas/parsers";
import { hashBlob, idbCacheGet, idbCacheSet } from "@/lib/utils/idb";
import type { Bounds } from "@/lib/utils/geometry";
import { Maximize2 } from "lucide-react";

export function ShareViewer({ slug }: { slug: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CanvasHandle | null>(null);

  useEffect(() => {
    fetch(`/api/share/${slug}/data`)
      .then((r) => r.json())
      .then((j) => {
        setData(j);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!data || data.kind !== "page") return;
    const page = data.page;
    useEditor.getState().init({
      pageId: page.id,
      role: "viewer",
      measurements: data.measurements,
      notes: data.notes,
      placedItems: data.placedItems || [],
      shapes: data.shapes || [],
      frames: data.frames || [],
      scale: page.scale_real_per_unit
        ? { realPerUnit: +page.scale_real_per_unit, unit: page.scale_unit || "mm" }
        : null,
      bounds: (page.source_bounds as Bounds | null) || null,
    });
    if (data.signedUrl) {
      (async () => {
        const res = await fetch(data.signedUrl);
        const blob = await res.blob();
        const hash = await hashBlob(blob);
        const cached = await idbCacheGet(hash);
        const type = page.source_file_type || inferFileType(page.source_file_name || "");
        let parsed = cached;
        if (!parsed) {
          parsed = await parseFile(blob, type);
          await idbCacheSet(hash, parsed);
        }
        useEditor.getState().setEntities(parsed.entities);
        useEditor.getState().setBounds(parsed.bounds);
      })().catch(console.error);
    }
  }, [data]);

  if (loading) {
    return <div className="p-12 text-ink-muted">Loading…</div>;
  }
  if (data?.error) {
    return <div className="p-12 text-measure">{data.error}</div>;
  }
  if (data?.kind === "project") {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-12">
        <h1 className="font-serif text-3xl">{data.project.name}</h1>
        {data.project.description ? (
          <p className="mt-2 text-ink-muted">{data.project.description}</p>
        ) : null}
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.pages.map((p: any) => (
            <li key={p.id}>
              <Link
                href={`/p/${slug}/${p.id}`}
                className="block rounded-md border border-border bg-panel p-4 hover:border-border-strong"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-ink-faint">
                  {p.source_file_type ? p.source_file_type.toUpperCase() : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (data?.kind === "page") {
    return (
      <div className="relative h-[calc(100vh-57px)] w-full">
        <Canvas onCanvasReady={setApi} />
        <NotesOverlay canEdit={false} onUpdate={() => {}} onDelete={() => {}} />
        <Toolbar />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
          <button
            onClick={() => api?.fitToContent()}
            className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-md border border-border bg-panel px-3 text-sm hover:border-border-strong"
          >
            <Maximize2 size={14} /> Fit
          </button>
          <span className="pointer-events-auto rounded-md border border-border bg-panel px-2 py-1 text-[11px] uppercase tracking-wider text-ink-muted">
            Viewing
          </span>
        </div>
      </div>
    );
  }
  return null;
}
