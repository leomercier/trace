"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, type CanvasHandle } from "./Canvas";
import { NotesOverlay } from "./NotesOverlay";
import { Toolbar } from "@/components/panels/Toolbar";
import { Inspector } from "@/components/panels/Inspector";
import { CalibrateDialog } from "@/components/panels/CalibrateDialog";
import { useEditor, type Tool } from "@/stores/editorStore";
import type { InventoryItem, Measurement, Note, Page, PlacedItem } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { parseFile, inferFileType } from "./parsers";
import { Button } from "@/components/ui/Button";
import { Upload, Download, Maximize2, Share2, Package, Sparkles } from "lucide-react";
import { ShareDialog } from "@/components/panels/ShareDialog";
import { MobileSheet } from "@/components/panels/MobileSheet";
import { AttachmentsPanel } from "@/components/panels/AttachmentsPanel";
import { EditorMobileBar } from "@/components/panels/EditorMobileBar";
import { InventoryDrawer } from "@/components/inventory/InventoryDrawer";
import { AssistantDrawer } from "@/components/assistant/AssistantDrawer";
import { idbCacheGet, idbCacheSet, hashBlob } from "@/lib/utils/idb";
import { subscribePage, broadcastCursor, broadcastDraft } from "@/lib/realtime/page";
import { Avatar, stringToColor } from "@/components/ui/Avatar";
import type { Bounds } from "@/lib/utils/geometry";

interface InitialData {
  page: Page;
  measurements: Measurement[];
  notes: Note[];
  placedItems: PlacedItem[];
  role: "owner" | "admin" | "editor" | "viewer";
  user: { id: string; name: string; email: string; avatar: string | null };
  orgId: string;
  orgSlug: string;
  projectId: string;
  projectName: string;
  pages: { id: string; name: string }[];
  signedUrl: string | null;
}

export function Editor({ initial }: { initial: InitialData }) {
  const supabase = createClient();
  const canvasApi = useRef<CanvasHandle | null>(null);
  const [calibrateOpen, setCalibrateOpen] = useState(false);
  const [calibrateLength, setCalibrateLength] = useState(0);
  const [calibratePending, setCalibratePending] = useState<{
    ax: number;
    ay: number;
    bx: number;
    by: number;
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [dwgConverting, setDwgConverting] = useState(false);
  const [draggingItem, setDraggingItem] = useState<InventoryItem | null>(null);
  const [presence, setPresence] = useState<
    { userId: string; name: string; color: string }[]
  >([]);

  // mark <body> so the org-level mobile bar can hide itself while we're in
  // the editor (the editor renders its own mobile bar).
  useEffect(() => {
    document.body.classList.add("trace-in-editor");
    return () => document.body.classList.remove("trace-in-editor");
  }, []);

  // boot store
  useEffect(() => {
    useEditor.getState().init({
      pageId: initial.page.id,
      role: initial.role,
      measurements: initial.measurements,
      notes: initial.notes,
      placedItems: initial.placedItems,
      scale:
        initial.page.scale_real_per_unit
          ? {
              realPerUnit: +initial.page.scale_real_per_unit,
              unit: (initial.page.scale_unit || "mm") as any,
            }
          : null,
      bounds: (initial.page.source_bounds as Bounds | null) || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.page.id]);

  // load source file (parse + cache by hash)
  useEffect(() => {
    if (!initial.signedUrl) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(initial.signedUrl!);
      const blob = await res.blob();
      const hash = await hashBlob(blob);
      const cached = await idbCacheGet(hash);
      const type = (initial.page.source_file_type || inferFileType(initial.page.source_file_name || "")) as any;
      let parsed = cached;
      if (!parsed) {
        parsed = await parseFile(blob, type);
        await idbCacheSet(hash, parsed);
      }
      if (cancelled) return;
      useEditor.getState().setEntities(parsed.entities);
      useEditor.getState().setBounds(parsed.bounds);
      // Persist bounds back if we just computed them
      if (!initial.page.source_bounds) {
        await supabase
          .from("pages")
          .update({ source_bounds: parsed.bounds })
          .eq("id", initial.page.id);
      }
    })().catch((err) => {
      console.error("Failed to load drawing:", err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.page.id, initial.signedUrl]);

  // realtime subscription
  useEffect(() => {
    const channel = subscribePage({
      pageId: initial.page.id,
      userId: initial.user.id,
      userName: initial.user.name,
      onMeasurement: (m, kind) => {
        const s = useEditor.getState();
        if (kind === "DELETE") s.removeMeasurement(m.id);
        else s.upsertMeasurement(m);
      },
      onNote: (n, kind) => {
        const s = useEditor.getState();
        if (kind === "DELETE") s.removeNote(n.id);
        else s.upsertNote(n);
      },
      onPlacedItem: (p, kind) => {
        const s = useEditor.getState();
        if (kind === "DELETE") s.removePlacedItem(p.id);
        else s.upsertPlacedItem(p);
      },
      onPageUpdate: (p) => {
        const s = useEditor.getState();
        if (p.scale_real_per_unit) s.setScale(+p.scale_real_per_unit, (p.scale_unit || "mm") as any);
        if (p.source_bounds) s.setBounds(p.source_bounds as Bounds);
      },
      onCursor: (c) => {
        if (c.userId === initial.user.id) return;
        useEditor.getState().upsertCursor({
          userId: c.userId,
          name: c.name,
          color: c.color,
          x: c.x,
          y: c.y,
          tool: c.tool,
          ts: Date.now(),
        });
      },
      onPresence: setPresence,
    });
    return () => {
      try { channel.unsubscribe(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.page.id]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || (target as any)?.isContentEditable) return;
      const map: Record<string, Tool> = {
        v: "select",
        h: "pan",
        m: "measure",
        n: "note",
        c: "calibrate",
      };
      const t = map[e.key.toLowerCase()];
      if (t) useEditor.getState().setTool(t);
      if (e.key === "Escape") {
        useEditor.getState().setDraft(null);
        useEditor.getState().setSelection(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = useEditor.getState().selection;
        if (sel && useEditor.getState().canEdit) {
          if (sel.kind === "measurement") deleteMeasurement(sel.id);
          if (sel.kind === "note") deleteNote(sel.id);
          if (sel.kind === "placed") deletePlacedItem(sel.id);
          useEditor.getState().setSelection(null);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setInventoryOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAssistantOpen(true);
      }
      if (e.key === "f" || e.key === "F") {
        canvasApi.current?.fitToContent();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cursor broadcast (~30 Hz)
  const lastCursorTs = useRef(0);
  const myColor = useRef(stringToColor(initial.user.id));

  function onPointerWorld(p: { x: number; y: number; snapped: boolean }) {
    const now = performance.now();
    const tool = useEditor.getState().tool;
    const draft = useEditor.getState().draft;
    if (draft) {
      useEditor.getState().setDraft({ ...draft, end: { x: p.x, y: p.y } });
      // broadcast draft on a slower clock
      if (now - lastCursorTs.current > 60) {
        broadcastDraft(initial.page.id, {
          userId: initial.user.id,
          start: draft.start,
          end: { x: p.x, y: p.y },
        });
      }
    }
    if (now - lastCursorTs.current > 33) {
      lastCursorTs.current = now;
      broadcastCursor(initial.page.id, {
        userId: initial.user.id,
        name: initial.user.name,
        color: myColor.current,
        x: p.x,
        y: p.y,
        tool,
      });
    }
  }

  async function onClickWorld(p: { x: number; y: number; snapped: boolean }) {
    const s = useEditor.getState();
    const tool = s.tool;
    if (!s.canEdit) return;
    if (tool === "measure" || tool === "calibrate") {
      if (!s.draft) {
        s.setDraft({ tool, start: { x: p.x, y: p.y }, end: { x: p.x, y: p.y } });
      } else {
        const { start } = s.draft;
        const end = { x: p.x, y: p.y };
        s.setDraft(null);
        if (tool === "measure") {
          await createMeasurement(start, end);
        } else {
          const len = Math.hypot(end.x - start.x, end.y - start.y);
          if (len < 0.0001) return;
          setCalibrateLength(len);
          setCalibratePending({ ax: start.x, ay: start.y, bx: end.x, by: end.y });
          setCalibrateOpen(true);
        }
      }
    } else if (tool === "note") {
      await createNote({ x: p.x, y: p.y });
    }
  }

  async function createMeasurement(a: { x: number; y: number }, b: { x: number; y: number }) {
    const s = useEditor.getState();
    const optimisticId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Measurement = {
      id: optimisticId,
      page_id: initial.page.id,
      ax: a.x as any,
      ay: a.y as any,
      bx: b.x as any,
      by: b.y as any,
      label: null,
      created_by: initial.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    s.upsertMeasurement(optimistic);
    const { data, error } = await supabase
      .from("measurements")
      .insert({
        page_id: initial.page.id,
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
      })
      .select("*")
      .single();
    s.removeMeasurement(optimisticId);
    if (!error && data) s.upsertMeasurement(data as any);
  }

  async function deleteMeasurement(id: string) {
    useEditor.getState().removeMeasurement(id);
    await supabase.from("measurements").delete().eq("id", id);
  }

  async function renameMeasurement(id: string, label: string | null) {
    const m = useEditor.getState().measurements[id];
    if (m) useEditor.getState().upsertMeasurement({ ...m, label });
    await supabase.from("measurements").update({ label }).eq("id", id);
  }

  async function createNote(p: { x: number; y: number }) {
    const optimisticId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Note = {
      id: optimisticId,
      page_id: initial.page.id,
      x: p.x as any,
      y: p.y as any,
      w: 200 as any,
      h: 100 as any,
      text: "",
      color: "#fef3c7",
      created_by: initial.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    useEditor.getState().upsertNote(optimistic);
    const { data, error } = await supabase
      .from("notes")
      .insert({ page_id: initial.page.id, x: p.x, y: p.y })
      .select("*")
      .single();
    useEditor.getState().removeNote(optimisticId);
    if (!error && data) useEditor.getState().upsertNote(data as any);
  }

  async function deleteNote(id: string) {
    useEditor.getState().removeNote(id);
    await supabase.from("notes").delete().eq("id", id);
  }

  async function updateNote(n: Note) {
    useEditor.getState().upsertNote(n);
    await supabase
      .from("notes")
      .update({ x: n.x, y: n.y, w: n.w, h: n.h, text: n.text, color: n.color })
      .eq("id", n.id);
  }

  async function applyCalibration(real: number, unit: any) {
    if (!calibratePending) return;
    const len = calibrateLength;
    const realPerUnit = real / len;
    useEditor.getState().setScale(realPerUnit, unit);
    await supabase
      .from("pages")
      .update({ scale_real_per_unit: realPerUnit, scale_unit: unit })
      .eq("id", initial.page.id);
    setCalibrateOpen(false);
    setCalibratePending(null);
  }

  function onSelectionPick(sel: { kind: "measurement" | "placed"; id: string } | null) {
    useEditor.getState().setSelection(sel);
  }

  // ============= Placed items =============

  async function placeItem(inv: InventoryItem, world: { x: number; y: number }) {
    if (initial.role === "viewer") return;
    const optimisticId = `tmp-${crypto.randomUUID()}`;
    const optimistic: PlacedItem = {
      id: optimisticId,
      page_id: initial.page.id,
      inventory_item_id: inv.id,
      name: inv.name,
      brand: inv.brand,
      svg_markup: inv.svg_markup,
      width_mm: inv.width_mm,
      depth_mm: inv.depth_mm,
      height_mm: inv.height_mm,
      x: world.x as any,
      y: world.y as any,
      rotation: 0 as any,
      scale_w: 1 as any,
      scale_d: 1 as any,
      z_order: 0,
      created_by: initial.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    useEditor.getState().upsertPlacedItem(optimistic);
    useEditor.getState().setSelection({ kind: "placed", id: optimisticId });

    const { data, error } = await supabase
      .from("placed_items")
      .insert({
        page_id: initial.page.id,
        inventory_item_id: inv.id,
        name: inv.name,
        brand: inv.brand,
        svg_markup: inv.svg_markup,
        width_mm: inv.width_mm,
        depth_mm: inv.depth_mm,
        height_mm: inv.height_mm,
        x: world.x,
        y: world.y,
      })
      .select("*")
      .single();
    useEditor.getState().removePlacedItem(optimisticId);
    if (!error && data) {
      useEditor.getState().upsertPlacedItem(data as PlacedItem);
      useEditor.getState().setSelection({ kind: "placed", id: (data as any).id });
    }
  }

  function onItemMove(id: string, x: number, y: number) {
    const item = useEditor.getState().placedItems[id];
    if (!item) return;
    useEditor.getState().upsertPlacedItem({ ...item, x: x as any, y: y as any });
  }
  function onItemResize(id: string, scale_w: number, scale_d: number) {
    const item = useEditor.getState().placedItems[id];
    if (!item) return;
    useEditor.getState().upsertPlacedItem({
      ...item,
      scale_w: scale_w as any,
      scale_d: scale_d as any,
    });
  }
  function onItemRotate(id: string, rotation: number) {
    const item = useEditor.getState().placedItems[id];
    if (!item) return;
    useEditor.getState().upsertPlacedItem({ ...item, rotation: rotation as any });
  }
  async function onItemMoveEnd(id: string) {
    const item = useEditor.getState().placedItems[id];
    if (!item) return;
    if (id.startsWith("tmp-")) return; // optimistic, will be replaced by insert response
    await supabase
      .from("placed_items")
      .update({
        x: item.x,
        y: item.y,
        scale_w: item.scale_w,
        scale_d: item.scale_d,
        rotation: item.rotation,
      })
      .eq("id", id);
  }
  async function updatePlacedItem(id: string, patch: Partial<PlacedItem>) {
    const item = useEditor.getState().placedItems[id];
    if (!item) return;
    const merged = { ...item, ...patch } as PlacedItem;
    useEditor.getState().upsertPlacedItem(merged);
    if (id.startsWith("tmp-")) return;
    await supabase
      .from("placed_items")
      .update(patch as any)
      .eq("id", id);
  }
  async function deletePlacedItem(id: string) {
    useEditor.getState().removePlacedItem(id);
    if (id.startsWith("tmp-")) return;
    await supabase.from("placed_items").delete().eq("id", id);
  }

  async function onUploadFile(file: File) {
    let blob: Blob = file;
    let fileName = file.name;
    let detected = inferFileType(file.name);

    // Convert DWG → DXF in the browser at upload time. The DXF is what gets
    // persisted; the original DWG is never stored. From the page's
    // perspective the source is now a DXF, and the existing parser path
    // takes over for rendering.
    if (detected === "dwg") {
      setDwgConverting(true);
      try {
        const { convertDwgToDxf } = await import("@/lib/utils/dwg");
        const dxf = await convertDwgToDxf(file);
        if (!dxf) {
          alert(
            "Could not convert this DWG. Try saving it as DXF in your CAD app and dropping that instead.",
          );
          setDwgConverting(false);
          return;
        }
        blob = dxf;
        fileName = file.name.replace(/\.dwg$/i, "") + ".dxf";
        detected = "dxf";
      } finally {
        setDwgConverting(false);
      }
    }

    const path = `${initial.orgId}/${initial.projectId}/${initial.page.id}/${fileName}`;
    const { error } = await supabase.storage.from("drawings").upload(path, blob, {
      upsert: true,
      cacheControl: "3600",
    });
    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }
    await supabase
      .from("pages")
      .update({
        source_storage_path: path,
        source_file_type: detected,
        source_file_name: fileName,
        source_file_size: blob.size,
      })
      .eq("id", initial.page.id);
    window.location.reload();
  }

  async function exportPng() {
    // Use the canvas element directly
    const cv = document.querySelector(".pixi-host canvas") as HTMLCanvasElement | null;
    if (!cv) return;
    const url = cv.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${initial.page.name}.png`;
    a.click();
  }

  async function renamePage(name: string) {
    await supabase.from("pages").update({ name }).eq("id", initial.page.id);
  }

  return (
    <div className="flex h-screen w-full flex-col md:h-[calc(100vh-57px)] md:flex-row">
      <EditorMobileBar
        orgSlug={initial.orgSlug}
        projectId={initial.projectId}
        projectName={initial.projectName}
        currentPageId={initial.page.id}
        currentPageName={initial.page.name}
        pages={initial.pages}
        canEdit={initial.role !== "viewer"}
        canAdmin={initial.role === "owner" || initial.role === "admin"}
        onShare={() => setShareOpen(true)}
      />
      <div className="relative min-w-0 flex-1">
        <Canvas
          onPointerWorld={onPointerWorld}
          onClickWorld={onClickWorld}
          onSelectionPick={onSelectionPick}
          onCanvasReady={(api) => (canvasApi.current = api)}
          onItemMove={onItemMove}
          onItemResize={onItemResize}
          onItemRotate={onItemRotate}
          onItemMoveEnd={onItemMoveEnd}
        />
        <NotesOverlay
          canEdit={useEditorCanEdit()}
          onUpdate={updateNote}
          onDelete={deleteNote}
        />
        <Toolbar />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
          <div className="pointer-events-auto flex items-center gap-2">
            {!initial.signedUrl && initial.role !== "viewer" ? (
              <UploadButton onUpload={onUploadFile} />
            ) : null}
            <button
              onClick={() => canvasApi.current?.fitToContent()}
              title="Fit to content (F)"
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-panel px-3 text-sm hover:border-border-strong"
            >
              <Maximize2 size={14} /> Fit
            </button>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {initial.role !== "viewer" ? (
              <button
                onClick={() => setInventoryOpen(true)}
                title="Inventory (⌘I)"
                className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-panel px-3 text-sm hover:border-border-strong"
              >
                <Package size={14} /> <span className="hidden md:inline">Inventory</span>
              </button>
            ) : null}
            <button
              onClick={() => setAssistantOpen(true)}
              title="Ask AI (⌘K)"
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-panel px-3 text-sm hover:border-border-strong"
              style={{ color: "#7c3aed" }}
            >
              <Sparkles size={14} /> <span className="hidden md:inline">Ask AI</span>
            </button>
            <PresenceStack me={initial.user.id} users={presence} />
            {(initial.role === "owner" || initial.role === "admin") && (
              <button
                onClick={() => setShareOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-panel px-3 text-sm hover:border-border-strong"
              >
                <Share2 size={14} /> <span className="hidden md:inline">Share</span>
              </button>
            )}
            {initial.role === "viewer" ? (
              <span className="rounded-md border border-border bg-panel px-2 py-1 text-[11px] uppercase tracking-wider text-ink-muted">
                Viewing
              </span>
            ) : null}
          </div>
        </div>

        {initial.role !== "viewer" && !dwgConverting ? (
          <FileDropOverlay
            empty={!initial.signedUrl}
            onUpload={onUploadFile}
          />
        ) : null}

        {dwgConverting ? (
          <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-canvas/90 backdrop-blur-sm">
            <div className="size-10 animate-spin rounded-full border-2 border-ink border-r-transparent" />
            <div className="font-serif text-2xl text-ink">Converting DWG…</div>
            <div className="text-sm text-ink-muted">
              First-time conversion downloads a 24MB engine. Subsequent uploads are instant.
            </div>
          </div>
        ) : null}

        <AttachmentsPanel
          pageId={initial.page.id}
          orgId={initial.orgId}
          projectId={initial.projectId}
          canEdit={initial.role !== "viewer"}
        />

        <CalibrateDialog
          open={calibrateOpen}
          onClose={() => setCalibrateOpen(false)}
          rawLength={calibrateLength}
          onApply={applyCalibration}
        />
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          scope="page"
          targetId={initial.page.id}
        />
        <InventoryDrawer
          open={inventoryOpen}
          onClose={() => setInventoryOpen(false)}
          orgId={initial.orgId}
          hasScale={!!useEditor.getState().scale}
          onPlace={(inv) => {
            // Place at current canvas centre.
            const cv = document.querySelector(".pixi-host") as HTMLElement | null;
            const r = cv?.getBoundingClientRect();
            const sx = r ? r.width / 2 : 0;
            const sy = r ? r.height / 2 : 0;
            const view = useEditor.getState().view;
            const w = { x: (sx - view.x) / view.zoom, y: (sy - view.y) / view.zoom };
            placeItem(inv, w);
            setInventoryOpen(false);
          }}
          onDragStart={(inv) => setDraggingItem(inv)}
          onDragEnd={() => setDraggingItem(null)}
        />
        <AssistantDrawer
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          pageId={initial.page.id}
        />
      </div>
      <MobileSheet
        pageName={initial.page.name}
        onCalibrateStart={() => useEditor.getState().setTool("calibrate")}
        onDeleteSelection={() => {
          const sel = useEditor.getState().selection;
          if (sel?.kind === "measurement") deleteMeasurement(sel.id);
          if (sel?.kind === "note") deleteNote(sel.id);
          useEditor.getState().setSelection(null);
        }}
      />
      <Inspector
        pageName={initial.page.name}
        onRename={renamePage}
        onRenameMeasurement={renameMeasurement}
        onDeleteMeasurement={deleteMeasurement}
        onUpdatePlacedItem={updatePlacedItem}
        onExportPng={exportPng}
        onDeleteSelection={() => {
          const sel = useEditor.getState().selection;
          if (sel?.kind === "measurement") deleteMeasurement(sel.id);
          if (sel?.kind === "note") deleteNote(sel.id);
          if (sel?.kind === "placed") deletePlacedItem(sel.id);
          useEditor.getState().setSelection(null);
        }}
        scaleControls={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => useEditor.getState().setTool("calibrate")}
            disabled={initial.role === "viewer"}
          >
            Calibrate scale
          </Button>
        }
      />
    </div>
  );
}

function useEditorCanEdit() {
  return useEditor((s) => s.canEdit);
}

function PresenceStack({
  users,
  me,
}: {
  users: { userId: string; name: string; color: string }[];
  me: string;
}) {
  const others = users.filter((u) => u.userId !== me);
  if (others.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {others.slice(0, 5).map((u) => (
        <div
          key={u.userId}
          className="rounded-full border-2 border-bg"
          title={u.name}
        >
          <Avatar name={u.name} color={u.color} size={28} />
        </div>
      ))}
      {others.length > 5 ? (
        <span className="ml-2 self-center text-xs text-ink-muted">+{others.length - 5}</span>
      ) : null}
    </div>
  );
}

function UploadButton({ onUpload }: { onUpload: (f: File) => void }) {
  return (
    <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-panel px-3 text-sm hover:border-border-strong">
      <Upload size={14} /> Replace
      <input
        type="file"
        className="hidden"
        accept=".dwg,.dxf,.pdf,.svg,.png,.jpg,.jpeg"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
      />
    </label>
  );
}

/**
 * Non-blocking drop target. Always listens for file drops on the whole canvas
 * area, but renders no UI unless the user is actively dragging a file. When
 * the page has no source drawing yet, shows a small "Add drawing" hint in
 * the corner — but the canvas underneath is fully usable for measurements,
 * notes, and placed items even with no drawing loaded.
 */
function FileDropOverlay({
  empty,
  onUpload,
}: {
  empty: boolean;
  onUpload: (f: File) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <>
      {/* Always-on file-drop catcher. pointer-events-none so it never blocks
          measurement / note / item interactions; only enables when a drag
          enters the window. */}
      <div
        onDragEnter={(e) => {
          if (e.dataTransfer.types?.includes("Files")) setOver(true);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types?.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={(e) => {
          // only leave if we left the overlay container itself
          if (e.currentTarget === e.target) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onUpload(f);
        }}
        className={`absolute inset-0 z-20 ${
          over ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {over ? (
          <div className="m-8 flex h-[calc(100%-4rem)] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink bg-panel-muted/90 text-ink backdrop-blur-sm">
            <Upload size={28} />
            <p className="font-serif text-2xl">Drop to upload</p>
            <p className="text-sm text-ink-muted">DWG, DXF, PDF, SVG, PNG, JPG</p>
          </div>
        ) : null}
      </div>

      {empty ? (
        <label className="pointer-events-auto absolute left-1/2 top-4 z-10 flex h-9 -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border bg-panel px-3 text-sm text-ink-muted hover:border-border-strong hover:text-ink">
          <Upload size={14} /> Add a drawing
          <input
            type="file"
            className="hidden"
            accept=".dwg,.dxf,.pdf,.svg,.png,.jpg,.jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
        </label>
      ) : null}
    </>
  );
}
