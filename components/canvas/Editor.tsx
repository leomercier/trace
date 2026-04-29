"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, type CanvasHandle } from "./Canvas";
import { NotesOverlay } from "./NotesOverlay";
import { Toolbar } from "@/components/panels/Toolbar";
import { Inspector } from "@/components/panels/Inspector";
import { CalibrateDialog } from "@/components/panels/CalibrateDialog";
import { useEditor, type Tool } from "@/stores/editorStore";
import type {
  InventoryItem,
  Measurement,
  Note,
  Page,
  PageDrawing,
  PlacedItem,
  Shape,
} from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { parseFile, inferFileType } from "./parsers";
import { Button } from "@/components/ui/Button";
import { Upload, Download, Maximize2, Share2, Package, Sparkles } from "lucide-react";
import { ShareDialog } from "@/components/panels/ShareDialog";
import { AttachmentsPanel } from "@/components/panels/AttachmentsPanel";
import { EditorMobileBar } from "@/components/panels/EditorMobileBar";
import { EditorTopBar } from "@/components/panels/EditorTopBar";
import { LayersPanel } from "@/components/panels/LayersPanel";
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
  shapes: Shape[];
  role: "owner" | "admin" | "editor" | "viewer";
  user: { id: string; name: string; email: string; avatar: string | null };
  orgId: string;
  orgSlug: string;
  orgIsAnonymous: boolean;
  orgExpiresAt: string | null;
  projectId: string;
  projectName: string;
  pages: { id: string; name: string }[];
  signedUrl: string | null;
  pageDrawings: PageDrawing[];
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
  const [mobileLayersOpen, setMobileLayersOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [dwgConverting, setDwgConverting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    name: string;
    phase: "uploading" | "processing";
  } | null>(null);
  const [draggingItem, setDraggingItem] = useState<InventoryItem | null>(null);
  const [presence, setPresence] = useState<
    { userId: string; name: string; color: string }[]
  >([]);

  // ============= Undo (in-memory, session-scoped) =============
  // Each user action pushes an inverse onto this stack. cmd-Z pops and
  // executes. Bounded to 50 entries. Not persisted across reload — that
  // would need a per-user audit table. For tomorrow's test, in-session
  // undo handles 95% of the "oh no" cases.
  const undoStack = useRef<Array<() => Promise<void> | void>>([]);
  const pushUndo = (fn: () => Promise<void> | void) => {
    undoStack.current.push(fn);
    if (undoStack.current.length > 50) undoStack.current.shift();
  };
  const undoOnce = async () => {
    const fn = undoStack.current.pop();
    if (fn) await fn();
  };

  // ============= Copy / paste (clipboard JSON) =============
  // We serialize the current selection as JSON to the OS clipboard so it
  // survives across tabs, and on paste we deserialize and re-create with
  // a small (40 world-unit) offset.
  async function copySelection() {
    const s = useEditor.getState();
    const sel = s.selection;
    if (!sel) return;
    let payload: any = null;
    if (sel.kind === "shape") payload = { kind: "shape", data: s.shapes[sel.id] };
    else if (sel.kind === "note") payload = { kind: "note", data: s.notes[sel.id] };
    else if (sel.kind === "placed") payload = { kind: "placed", data: s.placedItems[sel.id] };
    else if (sel.kind === "measurement")
      payload = { kind: "measurement", data: s.measurements[sel.id] };
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(
        "trace:clip:" + JSON.stringify(payload),
      );
    } catch {}
  }

  async function pasteClipboard() {
    if (initial.role === "viewer") return;
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    // URL paste → sticky note styled as a link card. Notes are HTML
    // overlays so the URL ends up clickable (the NotesOverlay
    // auto-detects bare URLs in note text and renders them as anchors).
    const urlMatch = text.trim().match(/^https?:\/\/\S+$/);
    if (urlMatch) {
      const v = useEditor.getState().view;
      const cv = document.querySelector(".pixi-host") as HTMLElement | null;
      const r = cv?.getBoundingClientRect();
      const sx = r ? r.width / 2 : 0;
      const sy = r ? r.height / 2 : 0;
      const wx = (sx - v.x) / v.zoom;
      const wy = (sy - v.y) / v.zoom;
      const id = crypto.randomUUID();
      const linkNote: Note = {
        id,
        page_id: initial.page.id,
        x: wx as any,
        y: wy as any,
        w: 320 as any,
        h: 80 as any,
        text: text.trim(),
        color: "#dbeafe",
        style: {
          bg: "#dbeafe",
          color: "#1e3a8a",
          font: "Inter",
          size: 14,
        },
        created_by: initial.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      useEditor.getState().upsertNote(linkNote);
      const { data, error } = await supabase
        .from("notes")
        .insert({
          id,
          page_id: initial.page.id,
          x: wx,
          y: wy,
          w: 320,
          h: 80,
          text: text.trim(),
          color: "#dbeafe",
          style: linkNote.style,
        })
        .select("*")
        .single();
      if (error) {
        useEditor.getState().removeNote(id);
        alert(`Couldn't paste link: ${error.message}`);
        return;
      }
      if (data) {
        useEditor.getState().upsertNote(data as Note);
        pushUndo(() => deleteNote(id));
      }
      return;
    }
    if (!text.startsWith("trace:clip:")) return;
    let parsed: any = null;
    try {
      parsed = JSON.parse(text.slice("trace:clip:".length));
    } catch {
      return;
    }
    const offset = 40;
    if (parsed.kind === "shape") {
      const d = parsed.data;
      await createShape({
        kind: d.kind,
        x: Number(d.x) + offset,
        y: Number(d.y) + offset,
        w: Number(d.w),
        h: Number(d.h),
        text: d.text || undefined,
      });
    } else if (parsed.kind === "placed") {
      const d = parsed.data;
      await placeItem(
        {
          id: d.inventory_item_id || crypto.randomUUID(),
          organisation_id: initial.orgId,
          source: "manual",
          name: d.name,
          category: null,
          brand: d.brand,
          price_text: null,
          width_mm: d.width_mm,
          depth_mm: d.depth_mm,
          height_mm: d.height_mm,
          svg_markup: d.svg_markup,
          thumbnail_url: null,
          source_url: null,
          query: null,
          created_by: null,
          created_at: new Date().toISOString(),
        },
        { x: Number(d.x) + offset, y: Number(d.y) + offset },
      );
    } else if (parsed.kind === "note") {
      const d = parsed.data;
      await createNote({ x: Number(d.x) + offset, y: Number(d.y) + offset });
    } else if (parsed.kind === "measurement") {
      const d = parsed.data;
      await createMeasurement(
        { x: Number(d.ax) + offset, y: Number(d.ay) + offset },
        { x: Number(d.bx) + offset, y: Number(d.by) + offset },
      );
    }
  }

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
      shapes: initial.shapes,
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

  // load all drawings (legacy primary + page_drawings rows)
  useEffect(() => {
    let cancelled = false;
    async function loadOne(args: {
      id: string;
      signedUrl: string;
      type: any;
      name: string;
      sortOrder: number;
      visible: boolean;
    }) {
      const res = await fetch(args.signedUrl);
      const blob = await res.blob();
      const hash = await hashBlob(blob);
      const cacheable = args.type === "dxf" || args.type === "dwg";
      const cached = cacheable ? await idbCacheGet(hash) : null;
      let parsed = cached;
      if (!parsed) {
        parsed = await parseFile(blob, args.type);
        if (cacheable) await idbCacheSet(hash, parsed);
      }
      if (cancelled) return null;
      useEditor.getState().upsertDrawing({
        id: args.id,
        name: args.name,
        fileType: args.type,
        entities: parsed.entities,
        bounds: parsed.bounds,
        visible: args.visible,
        sortOrder: args.sortOrder,
      });
      return parsed;
    }

    (async () => {
      // 1) Legacy primary source on the page.
      if (initial.signedUrl) {
        const type = (initial.page.source_file_type ||
          inferFileType(initial.page.source_file_name || "")) as any;
        const parsed = await loadOne({
          id: "primary",
          signedUrl: initial.signedUrl,
          type,
          name: initial.page.source_file_name || "Drawing",
          sortOrder: 0,
          visible: true,
        });
        if (parsed && !initial.page.source_bounds) {
          await supabase
            .from("pages")
            .update({ source_bounds: parsed.bounds })
            .eq("id", initial.page.id);
        }
      }

      // 2) Additional drawings (page_drawings table).
      for (const d of initial.pageDrawings || []) {
        const { data: signed } = await supabase.storage
          .from("drawings")
          .createSignedUrl(d.storage_path, 60 * 60);
        if (!signed?.signedUrl) continue;
        await loadOne({
          id: d.id,
          signedUrl: signed.signedUrl,
          type: (d.file_type || inferFileType(d.file_name || "")) as any,
          name: d.file_name || "Layer",
          sortOrder: d.sort_order ?? 1,
          visible: d.visible,
        });
      }
    })().catch((err) => {
      console.error("Failed to load drawings:", err);
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
      onShape: (sh, kind) => {
        const s = useEditor.getState();
        if (kind === "DELETE") s.removeShape(sh.id);
        else s.upsertShape(sh);
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
        t: "text",
        l: "line",
        r: "rect",
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
          if (sel.kind === "shape") deleteShape(sel.id);
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoOnce();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        // Don't hijack copy when text is selected in an input.
        const sel = window.getSelection?.()?.toString();
        if (!sel) {
          e.preventDefault();
          copySelection();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
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
    if (tool === "measure" || tool === "calibrate" || tool === "line" || tool === "rect") {
      if (!s.draft) {
        s.setDraft({ tool, start: { x: p.x, y: p.y }, end: { x: p.x, y: p.y } });
      } else {
        const { start } = s.draft;
        const end = { x: p.x, y: p.y };
        s.setDraft(null);
        if (tool === "measure") {
          await createMeasurement(start, end);
        } else if (tool === "line") {
          await createShape({
            kind: "line",
            x: start.x,
            y: start.y,
            w: end.x - start.x,
            h: end.y - start.y,
          });
        } else if (tool === "rect") {
          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const w = Math.abs(end.x - start.x);
          const h = Math.abs(end.y - start.y);
          if (w < 0.5 || h < 0.5) return;
          await createShape({ kind: "rect", x, y, w, h });
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
    } else if (tool === "text") {
      await createShape({
        kind: "text",
        x: p.x,
        y: p.y,
        w: 240,
        h: 48,
        text: "",
      });
    }
  }

  async function createShape(args: {
    kind: "line" | "rect" | "text";
    x: number;
    y: number;
    w: number;
    h: number;
    text?: string;
  }) {
    // Use a real UUID up front — no tmp/swap dance. If the insert fails
    // (table missing, RLS blocked, network), we revert and surface the
    // error instead of silently dropping the user's shape.
    const id = crypto.randomUUID();
    const isText = args.kind === "text";
    const isLine = args.kind === "line";
    const optimistic: Shape = {
      id,
      page_id: initial.page.id,
      kind: args.kind,
      x: args.x as any,
      y: args.y as any,
      w: args.w as any,
      h: args.h as any,
      rotation: 0 as any,
      stroke: "#1c1917",
      stroke_width: isLine ? 2 : 1.5,
      stroke_opacity: 1,
      fill: null,
      fill_opacity: 1,
      text: args.text ?? null,
      style: isText ? { font: "Inter", size: 24, color: "#1c1917" } : null,
      z_order: 0,
      locked: false,
      created_by: initial.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    useEditor.getState().upsertShape(optimistic);
    useEditor.getState().setSelection({ kind: "shape", id });
    useEditor.getState().setTool("select");

    const { data, error } = await supabase
      .from("shapes")
      .insert({
        id,
        page_id: initial.page.id,
        kind: optimistic.kind,
        x: optimistic.x,
        y: optimistic.y,
        w: optimistic.w,
        h: optimistic.h,
        stroke: optimistic.stroke,
        stroke_width: optimistic.stroke_width,
        fill: optimistic.fill,
        text: optimistic.text,
        style: optimistic.style,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[trace] failed to create shape:", error);
      useEditor.getState().removeShape(id);
      alert(
        `Couldn't save the ${args.kind}: ${error.message}\n\n` +
          "If this is a new project, run supabase/bootstrap.sql in Supabase Studio, then redeploy.",
      );
      return;
    }
    if (data) {
      useEditor.getState().upsertShape(data as Shape);
      pushUndo(() => deleteShape(id));
    }
  }

  async function updateShape(id: string, patch: Partial<Shape>) {
    const cur = useEditor.getState().shapes[id];
    if (!cur) return;
    useEditor.getState().upsertShape({ ...cur, ...patch } as Shape);
    if (id.startsWith("tmp-")) return;
    await supabase.from("shapes").update(patch as any).eq("id", id);
  }

  async function deleteShape(id: string) {
    useEditor.getState().removeShape(id);
    if (id.startsWith("tmp-")) return;
    await supabase.from("shapes").delete().eq("id", id);
  }

  async function createMeasurement(a: { x: number; y: number }, b: { x: number; y: number }) {
    const s = useEditor.getState();
    const id = crypto.randomUUID();
    const optimistic: Measurement = {
      id,
      page_id: initial.page.id,
      ax: a.x as any,
      ay: a.y as any,
      bx: b.x as any,
      by: b.y as any,
      label: null,
      label_dx: 0 as any,
      label_dy: 0 as any,
      created_by: initial.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    s.upsertMeasurement(optimistic);
    const { data, error } = await supabase
      .from("measurements")
      .insert({
        id,
        page_id: initial.page.id,
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[trace] failed to create measurement:", error);
      s.removeMeasurement(id);
      alert(`Couldn't save measurement: ${error.message}`);
      return;
    }
    if (data) {
      s.upsertMeasurement(data as any);
      pushUndo(() => deleteMeasurement(id));
    }
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
    const id = crypto.randomUUID();
    const optimistic: Note = {
      id,
      page_id: initial.page.id,
      x: p.x as any,
      y: p.y as any,
      w: 240 as any,
      h: 140 as any,
      text: "",
      color: "#fef3c7",
      style: { bg: "#fef3c7", color: "#1c1917", font: "Caveat", size: 18 },
      created_by: initial.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    useEditor.getState().upsertNote(optimistic);
    const { data, error } = await supabase
      .from("notes")
      .insert({
        id,
        page_id: initial.page.id,
        x: p.x,
        y: p.y,
        w: optimistic.w,
        h: optimistic.h,
        style: optimistic.style,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[trace] failed to create note:", error);
      useEditor.getState().removeNote(id);
      alert(`Couldn't save note: ${error.message}`);
      return;
    }
    if (data) {
      useEditor.getState().upsertNote(data as any);
      pushUndo(() => deleteNote(id));
    }
  }

  async function deleteNote(id: string) {
    useEditor.getState().removeNote(id);
    await supabase.from("notes").delete().eq("id", id);
  }

  async function updateNote(n: Note) {
    useEditor.getState().upsertNote(n);
    await supabase
      .from("notes")
      .update({
        x: n.x,
        y: n.y,
        w: n.w,
        h: n.h,
        text: n.text,
        color: n.color,
        style: n.style,
      })
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

  function onSelectionPick(
    sel: { kind: "measurement" | "placed" | "shape"; id: string } | null,
  ) {
    useEditor.getState().setSelection(sel);
  }

  // ============= Placed items =============

  async function placeItem(inv: InventoryItem, world: { x: number; y: number }) {
    if (initial.role === "viewer") return;
    const id = crypto.randomUUID();
    const optimistic: PlacedItem = {
      id,
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
      locked: false,
      created_by: initial.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    useEditor.getState().upsertPlacedItem(optimistic);
    useEditor.getState().setSelection({ kind: "placed", id });

    const { data, error } = await supabase
      .from("placed_items")
      .insert({
        id,
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
    if (error) {
      console.error("[trace] failed to place item:", error);
      useEditor.getState().removePlacedItem(id);
      alert(`Couldn't place item: ${error.message}`);
      return;
    }
    if (data) {
      useEditor.getState().upsertPlacedItem(data as PlacedItem);
      pushUndo(() => deletePlacedItem(id));
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

  async function changePlacedItemZ(
    id: string,
    mode: "front" | "back" | "forward" | "backward",
  ) {
    const items = Object.values(useEditor.getState().placedItems);
    const sorted = items.sort(
      (a, b) =>
        Number(a.z_order ?? 0) - Number(b.z_order ?? 0) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const idx = sorted.findIndex((i) => i.id === id);
    if (idx < 0) return;
    let newZ: number;
    if (mode === "front") {
      newZ = (Number(sorted[sorted.length - 1].z_order ?? 0) || 0) + 1;
    } else if (mode === "back") {
      newZ = (Number(sorted[0].z_order ?? 0) || 0) - 1;
    } else if (mode === "forward") {
      const above = sorted[idx + 1];
      newZ = above ? Number(above.z_order ?? 0) + 1 : Number(sorted[idx].z_order ?? 0) + 1;
    } else {
      const below = sorted[idx - 1];
      newZ = below ? Number(below.z_order ?? 0) - 1 : Number(sorted[idx].z_order ?? 0) - 1;
    }
    await updatePlacedItem(id, { z_order: newZ as any });
  }

  async function onDeletePage(pageId: string) {
    // Server delete via cascade (RLS-gated). After delete, navigate to a
    // sibling page if available, else back to the project.
    const others = initial.pages.filter((p) => p.id !== pageId);
    await supabase.from("pages").delete().eq("id", pageId);
    if (pageId === initial.page.id) {
      const next = others[0]?.id;
      if (next) {
        window.location.href = `/app/${initial.orgSlug}/${initial.projectId}/${next}`;
      } else {
        window.location.href = `/app/${initial.orgSlug}/${initial.projectId}`;
      }
    } else {
      window.location.reload();
    }
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
      setUploadStatus({ name: file.name, phase: "processing" });
      try {
        const { convertDwgToDxf } = await import("@/lib/utils/dwg");
        const dxf = await convertDwgToDxf(file);
        if (!dxf) {
          alert(
            "Could not convert this DWG. Try saving it as DXF in your CAD app and dropping that instead.",
          );
          setDwgConverting(false);
          setUploadStatus(null);
          return;
        }
        blob = dxf;
        fileName = file.name.replace(/\.dwg$/i, "") + ".dxf";
        detected = "dxf";
      } finally {
        setDwgConverting(false);
      }
    }

    setUploadStatus({ name: fileName, phase: "uploading" });

    const layerId = crypto.randomUUID();
    // If the page already has a primary, every new file becomes an
    // additional layer (page_drawings row). If the page is empty, this
    // becomes the primary so the existing single-source flow keeps
    // working too.
    const isPrimary = !initial.signedUrl && (initial.pageDrawings?.length ?? 0) === 0;
    const path = `${initial.orgId}/${initial.projectId}/${initial.page.id}/${
      isPrimary ? "" : `layers/${layerId}/`
    }${fileName}`;
    const { error } = await supabase.storage.from("drawings").upload(path, blob, {
      upsert: true,
      cacheControl: "3600",
    });
    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }
    if (isPrimary) {
      await supabase
        .from("pages")
        .update({
          source_storage_path: path,
          source_file_type: detected,
          source_file_name: fileName,
          source_file_size: blob.size,
        })
        .eq("id", initial.page.id);
    } else {
      const existingMax =
        Math.max(
          0,
          ...Object.values(useEditor.getState().drawings).map((d) => d.sortOrder),
        ) + 1;
      await supabase.from("page_drawings").insert({
        id: layerId,
        page_id: initial.page.id,
        storage_path: path,
        file_type: detected,
        file_name: fileName,
        file_size: blob.size,
        sort_order: existingMax,
      });
    }
    window.location.reload();
  }

  async function setDrawingVisible(id: string, visible: boolean) {
    useEditor.getState().toggleDrawing(id);
    if (id === "primary") return; // not persisted yet — UI-only for legacy primary
    await supabase
      .from("page_drawings")
      .update({ visible })
      .eq("id", id);
  }

  async function deleteDrawing(id: string) {
    if (id === "primary") {
      // Clear the legacy primary.
      const path = initial.page.source_storage_path;
      useEditor.getState().removeDrawing("primary");
      if (path) {
        await supabase.storage.from("drawings").remove([path]);
      }
      await supabase
        .from("pages")
        .update({
          source_storage_path: null,
          source_file_type: null,
          source_file_name: null,
          source_file_size: null,
        })
        .eq("id", initial.page.id);
    } else {
      const drawing = useEditor.getState().drawings[id];
      const meta = initial.pageDrawings.find((p) => p.id === id);
      useEditor.getState().removeDrawing(id);
      if (meta?.storage_path) {
        await supabase.storage.from("drawings").remove([meta.storage_path]);
      }
      await supabase.from("page_drawings").delete().eq("id", id);
    }
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
    <div className="flex h-screen w-full flex-col">
      <div className="hidden md:block">
        <EditorTopBar
          orgId={initial.orgId}
          orgSlug={initial.orgSlug}
          isAnonymous={initial.orgIsAnonymous}
          expiresAt={initial.orgExpiresAt}
          projectId={initial.projectId}
          projectName={initial.projectName}
          currentPageId={initial.page.id}
          currentPageName={initial.page.name}
          pages={initial.pages}
          user={initial.user}
          role={initial.role}
          presence={presence}
          onFit={() => canvasApi.current?.fitToContent()}
          onInventory={() => setInventoryOpen(true)}
          onAssistant={() => setAssistantOpen(true)}
          onShare={() => setShareOpen(true)}
          onDeletePage={onDeletePage}
        />
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col md:flex-row">
      <EditorMobileBar
        orgSlug={initial.orgSlug}
        projectId={initial.projectId}
        projectName={initial.projectName}
        currentPageId={initial.page.id}
        currentPageName={initial.page.name}
        pages={initial.pages}
        canEdit={initial.role !== "viewer"}
        canAdmin={initial.role === "owner" || initial.role === "admin"}
        onLayers={() => setMobileLayersOpen(true)}
        onInspector={() => setMobileInspectorOpen(true)}
        onDeletePage={onDeletePage}
      />
      <LayersPanel
        canEdit={initial.role !== "viewer"}
        mobileOpen={mobileLayersOpen}
        onMobileClose={() => setMobileLayersOpen(false)}
        onUpload={onUploadFile}
        onSetVisible={setDrawingVisible}
        onDelete={deleteDrawing}
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
          onMeasurementLabelMove={(id, dx, dy) => {
            const m = useEditor.getState().measurements[id];
            if (!m) return;
            useEditor.getState().upsertMeasurement({
              ...m,
              label_dx: dx as any,
              label_dy: dy as any,
            });
          }}
          onMeasurementLabelMoveEnd={async (id) => {
            const m = useEditor.getState().measurements[id];
            if (!m) return;
            if (id.startsWith("tmp-")) return;
            await supabase
              .from("measurements")
              .update({ label_dx: m.label_dx, label_dy: m.label_dy })
              .eq("id", id);
          }}
        />
        <NotesOverlay
          canEdit={useEditorCanEdit()}
          onUpdate={updateNote}
          onDelete={deleteNote}
        />
        <Toolbar
          attachmentCount={attachmentCount}
          onOpenAttachments={() => setAttachmentsOpen(true)}
          onFit={() => canvasApi.current?.fitToContent()}
          onExportPng={exportPng}
        />

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

        {uploadStatus && !dwgConverting ? (
          <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 shadow-md">
              <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-ink border-r-transparent" />
              <div className="text-xs">
                <span className="text-ink-muted">
                  {uploadStatus.phase === "uploading" ? "Uploading " : "Processing "}
                </span>
                <span className="font-num text-ink">{uploadStatus.name}</span>
              </div>
            </div>
            {/* Skeleton placeholder where the drawing will appear */}
            <div className="mx-auto mt-3 h-40 w-72 animate-pulse rounded-md border border-dashed border-border bg-panel-muted/60" />
          </div>
        ) : null}

        <AttachmentsPanel
          pageId={initial.page.id}
          orgId={initial.orgId}
          projectId={initial.projectId}
          canEdit={initial.role !== "viewer"}
          open={attachmentsOpen}
          onClose={() => setAttachmentsOpen(false)}
          onCountChange={setAttachmentCount}
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
          onApplyActions={async (actions) => {
            for (const a of actions) {
              try {
                if (a.name === "add_note") {
                  await createNote({ x: Number(a.input.x), y: Number(a.input.y) });
                  // patch text on the just-created note
                  const last = Object.values(useEditor.getState().notes)
                    .sort(
                      (x, y) =>
                        new Date(y.created_at).getTime() -
                        new Date(x.created_at).getTime(),
                    )[0];
                  if (last && a.input.text) {
                    await updateNote({ ...last, text: String(a.input.text) });
                  }
                } else if (a.name === "add_measurement") {
                  await createMeasurement(
                    { x: Number(a.input.ax), y: Number(a.input.ay) },
                    { x: Number(a.input.bx), y: Number(a.input.by) },
                  );
                } else if (a.name === "add_shape") {
                  await createShape({
                    kind: (a.input.kind || "rect") as any,
                    x: Number(a.input.x),
                    y: Number(a.input.y),
                    w: Number(a.input.w),
                    h: Number(a.input.h),
                    text: a.input.text || undefined,
                  });
                  // Apply optional stroke/fill/stroke_width on the shape we just made.
                  const last = Object.values(useEditor.getState().shapes).sort(
                    (x, y) =>
                      new Date(y.created_at).getTime() -
                      new Date(x.created_at).getTime(),
                  )[0];
                  if (last) {
                    const patch: any = {};
                    if (a.input.stroke) patch.stroke = a.input.stroke;
                    if (a.input.fill) patch.fill = a.input.fill;
                    if (a.input.stroke_width) patch.stroke_width = a.input.stroke_width;
                    if (Object.keys(patch).length > 0) await updateShape(last.id, patch);
                  }
                }
              } catch (err) {
                console.error("[trace] failed to apply action", a, err);
              }
            }
          }}
        />
      </div>
      <Inspector
        pageName={initial.page.name}
        mobileOpen={mobileInspectorOpen}
        onMobileClose={() => setMobileInspectorOpen(false)}
        onRename={renamePage}
        onRenameMeasurement={renameMeasurement}
        onDeleteMeasurement={deleteMeasurement}
        onUpdatePlacedItem={updatePlacedItem}
        onChangePlacedItemZ={changePlacedItemZ}
        onUpdateShape={updateShape}
        onDeleteShape={deleteShape}
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
