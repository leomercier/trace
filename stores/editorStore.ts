"use client";

import { create } from "zustand";
import type { Frame, Measurement, Note, PlacedItem, Shape } from "@/lib/supabase/types";
import type { Bounds, Pt } from "@/lib/utils/geometry";
import type { Unit } from "@/lib/utils/units";

export type Tool =
  | "select"
  | "pan"
  | "measure"
  | "note"
  | "calibrate"
  | "line"
  | "rect"
  | "text"
  | "frame";
export type Role = "owner" | "admin" | "editor" | "viewer";

export interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  tool: Tool;
  ts: number;
}

export interface EditorState {
  pageId: string | null;
  role: Role;
  canEdit: boolean;

  // viewport
  view: { x: number; y: number; zoom: number };

  // tools
  tool: Tool;
  draft: { tool: Tool; start: Pt; end: Pt } | null;
  selection:
    | { kind: "measurement" | "note" | "placed" | "shape" | "drawing" | "frame"; id: string }
    | null;
  // Additional placed-item selections (multi-select). The primary item lives
  // in `selection`; these are siblings.
  multiSelection: Set<string>;

  // data
  measurements: Record<string, Measurement>;
  notes: Record<string, Note>;
  placedItems: Record<string, PlacedItem>;
  shapes: Record<string, Shape>;
  frames: Record<string, Frame>;
  scale: { realPerUnit: number; unit: Unit } | null;
  bounds: Bounds | null;

  // layers
  layers: {
    measurements: boolean;
    notes: boolean;
    cursors: boolean;
    items: boolean;
    shapes: boolean;
    frames: boolean;
  };

  // grid
  grid: { visible: boolean; sizeMM: number };

  // Per-item aspect-ratio lock (UI-only). When true, resizing the item via
  // canvas handles preserves W:D; Shift+drag inverts the lock for that drag.
  aspectLockedItems: Record<string, true>;

  // drawing entities (parsed from source file). Live in memory only.
  entities: ParsedEntity[];
  entitiesLoaded: boolean;

  // Multi-file drawings (legacy primary + page_drawings rows). Keyed by
  // the source id ("primary" for the legacy single-source, otherwise the
  // page_drawings.id UUID).
  drawings: Record<string, Drawing>;

  // actions
  init: (args: {
    pageId: string;
    role: Role;
    measurements: Measurement[];
    notes: Note[];
    placedItems: PlacedItem[];
    shapes: Shape[];
    frames: Frame[];
    scale: { realPerUnit: number; unit: Unit } | null;
    bounds: Bounds | null;
  }) => void;
  setTool: (t: Tool) => void;
  setDraft: (d: EditorState["draft"]) => void;
  setSelection: (s: EditorState["selection"]) => void;
  toggleMultiSelection: (id: string) => void;
  clearMultiSelection: () => void;
  setView: (v: Partial<EditorState["view"]>) => void;
  upsertMeasurement: (m: Measurement) => void;
  removeMeasurement: (id: string) => void;
  upsertNote: (n: Note) => void;
  removeNote: (id: string) => void;
  upsertPlacedItem: (p: PlacedItem) => void;
  removePlacedItem: (id: string) => void;
  /** One-set update for many items (used by reorder). */
  patchPlacedItems: (patches: { id: string; patch: Partial<PlacedItem> }[]) => void;
  upsertShape: (s: Shape) => void;
  removeShape: (id: string) => void;
  patchShapes: (patches: { id: string; patch: Partial<Shape> }[]) => void;
  upsertFrame: (f: Frame) => void;
  removeFrame: (id: string) => void;
  setScale: (realPerUnit: number, unit: Unit) => void;
  setBounds: (b: Bounds) => void;
  setEntities: (entities: ParsedEntity[]) => void;
  upsertDrawing: (d: Drawing) => void;
  removeDrawing: (id: string) => void;
  toggleDrawing: (id: string) => void;
  renameDrawing: (id: string, name: string) => void;
  setDrawingTransform: (
    id: string,
    patch: Partial<Pick<Drawing, "tx" | "ty" | "scale" | "rotation" | "locked">>,
  ) => void;
  /** Replace drawing sortOrders in bulk (used by drag-and-drop reordering). */
  setDrawingOrder: (orderedIds: string[]) => void;
  toggleLayer: (k: keyof EditorState["layers"]) => void;
  toggleGrid: () => void;
  setGridSize: (mm: number) => void;
  toggleAspectLock: (id: string) => void;
}

export type ParsedEntity =
  | { kind: "line"; ax: number; ay: number; bx: number; by: number; color?: number }
  | { kind: "polyline"; points: number[]; color?: number; closed?: boolean }
  | { kind: "circle"; cx: number; cy: number; r: number; color?: number }
  | { kind: "arc"; cx: number; cy: number; r: number; start: number; end: number; color?: number }
  | { kind: "text"; x: number; y: number; size: number; text: string; color?: number }
  | { kind: "image"; x: number; y: number; w: number; h: number; src: string };

export interface Drawing {
  id: string;            // "primary" for legacy single-source, otherwise page_drawings.id
  name: string;
  fileType: string;
  entities: ParsedEntity[];
  bounds: Bounds;
  visible: boolean;
  locked: boolean;
  sortOrder: number;
  // Per-drawing transform applied to its entities when composing the
  // rendered union. (0, 0, 1, 0) is identity.
  tx: number;
  ty: number;
  scale: number;
  rotation: number; // degrees
}

function transformEntity(e: ParsedEntity, d: Drawing): ParsedEntity {
  const { tx, ty, scale, rotation } = d;
  if (tx === 0 && ty === 0 && scale === 1 && rotation === 0) return e;
  // Pivot scale + rotation around the drawing's natural centre so the
  // user's mental model holds: scale grows the layer about its centre,
  // rotation spins it about its centre, and (tx, ty) is just the offset
  // applied to that centre. With this convention, identity is
  // (tx=0, ty=0, scale=1, rotation=0) regardless of where the drawing's
  // raw entities sit in source coords.
  const cx = (d.bounds.minX + d.bounds.maxX) / 2;
  const cy = (d.bounds.minY + d.bounds.maxY) / 2;
  const r = (rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const xform = (x: number, y: number) => {
    const lx = (x - cx) * scale;
    const ly = (y - cy) * scale;
    return {
      x: lx * cos - ly * sin + cx + tx,
      y: lx * sin + ly * cos + cy + ty,
    };
  };
  switch (e.kind) {
    case "line": {
      const a = xform(e.ax, e.ay);
      const b = xform(e.bx, e.by);
      return { kind: "line", ax: a.x, ay: a.y, bx: b.x, by: b.y, color: e.color };
    }
    case "polyline": {
      const pts: number[] = [];
      for (let i = 0; i < e.points.length; i += 2) {
        const p = xform(e.points[i], e.points[i + 1]);
        pts.push(p.x, p.y);
      }
      return { kind: "polyline", points: pts, closed: e.closed, color: e.color };
    }
    case "circle": {
      const c = xform(e.cx, e.cy);
      return { kind: "circle", cx: c.x, cy: c.y, r: e.r * scale, color: e.color };
    }
    case "arc": {
      const c = xform(e.cx, e.cy);
      return {
        kind: "arc",
        cx: c.x,
        cy: c.y,
        r: e.r * scale,
        start: e.start + r,
        end: e.end + r,
        color: e.color,
      };
    }
    case "text": {
      const p = xform(e.x, e.y);
      return { kind: "text", x: p.x, y: p.y, size: e.size * scale, text: e.text, color: e.color };
    }
    case "image": {
      // Translate the image's top-left, then expand bounds by scale. We
      // can't do a true affine on a Pixi sprite via entities alone, but
      // (translate + uniform scale) is what most users want for layer
      // placement.
      const p = xform(e.x, e.y);
      return { kind: "image", x: p.x, y: p.y, w: e.w * scale, h: e.h * scale, src: e.src };
    }
  }
}

function recomputeEntities(drawings: Record<string, Drawing>): {
  entities: ParsedEntity[];
  bounds: Bounds | null;
} {
  const ordered = Object.values(drawings).sort((a, b) => a.sortOrder - b.sortOrder);
  const entities: ParsedEntity[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const d of ordered) {
    if (!d.visible) continue;
    const isIdentity =
      d.tx === 0 && d.ty === 0 && d.scale === 1 && d.rotation === 0;
    if (isIdentity) {
      entities.push(...d.entities);
      if (d.bounds) {
        if (d.bounds.minX < minX) minX = d.bounds.minX;
        if (d.bounds.minY < minY) minY = d.bounds.minY;
        if (d.bounds.maxX > maxX) maxX = d.bounds.maxX;
        if (d.bounds.maxY > maxY) maxY = d.bounds.maxY;
      }
    } else {
      // Apply per-drawing transform to each entity. For very large
      // drawings this is the moment we pay; subsequent renders just
      // walk the cached, already-transformed array.
      for (const e of d.entities) entities.push(transformEntity(e, d));
      if (d.bounds) {
        // Conservative bounds: transform the four corners with the same
        // centre-pivoting convention as transformEntity().
        const cx = (d.bounds.minX + d.bounds.maxX) / 2;
        const cy = (d.bounds.minY + d.bounds.maxY) / 2;
        const r = (d.rotation * Math.PI) / 180;
        const cos = Math.cos(r);
        const sin = Math.sin(r);
        const corners = [
          { x: d.bounds.minX, y: d.bounds.minY },
          { x: d.bounds.maxX, y: d.bounds.minY },
          { x: d.bounds.minX, y: d.bounds.maxY },
          { x: d.bounds.maxX, y: d.bounds.maxY },
        ];
        for (const c of corners) {
          const lx = (c.x - cx) * d.scale;
          const ly = (c.y - cy) * d.scale;
          const wx = lx * cos - ly * sin + cx + d.tx;
          const wy = lx * sin + ly * cos + cy + d.ty;
          if (wx < minX) minX = wx;
          if (wy < minY) minY = wy;
          if (wx > maxX) maxX = wx;
          if (wy > maxY) maxY = wy;
        }
      }
    }
  }
  const bounds =
    minX !== Infinity ? { minX, minY, maxX, maxY } : null;
  return { entities, bounds };
}

export const useEditor = create<EditorState>((set) => ({
  pageId: null,
  role: "viewer",
  canEdit: false,
  view: { x: 0, y: 0, zoom: 1 },
  tool: "select",
  draft: null,
  selection: null,
  multiSelection: new Set<string>(),
  measurements: {},
  notes: {},
  placedItems: {},
  shapes: {},
  frames: {},
  scale: null,
  bounds: null,
  layers: { measurements: true, notes: true, cursors: true, items: true, shapes: true, frames: true },
  grid: { visible: true, sizeMM: 1000 },
  aspectLockedItems: {},
  entities: [],
  entitiesLoaded: false,
  drawings: {},

  init: ({ pageId, role, measurements, notes, placedItems, shapes, frames, scale, bounds }) =>
    set(() => ({
      pageId,
      role,
      canEdit: role !== "viewer",
      measurements: Object.fromEntries(measurements.map((m) => [m.id, m])),
      notes: Object.fromEntries(notes.map((n) => [n.id, n])),
      placedItems: Object.fromEntries(placedItems.map((p) => [p.id, p])),
      shapes: Object.fromEntries(shapes.map((s) => [s.id, s])),
      frames: Object.fromEntries(frames.map((f) => [f.id, f])),
      scale,
      bounds,
      tool: role !== "viewer" ? "select" : "pan",
      drawings: {},
      entities: [],
      entitiesLoaded: false,
    })),

  setTool: (t) => set({ tool: t, draft: null }),
  setDraft: (d) => set({ draft: d }),
  setSelection: (s) => set({ selection: s, multiSelection: new Set<string>() }),
  toggleMultiSelection: (id) =>
    set((state) => {
      const next = new Set(state.multiSelection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { multiSelection: next };
    }),
  clearMultiSelection: () =>
    set({ multiSelection: new Set<string>() }),
  setView: (v) =>
    set((state) => ({ view: { ...state.view, ...v } })),

  upsertMeasurement: (m) =>
    set((s) => ({ measurements: { ...s.measurements, [m.id]: m } })),
  removeMeasurement: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.measurements;
      return { measurements: rest };
    }),
  upsertNote: (n) => set((s) => ({ notes: { ...s.notes, [n.id]: n } })),
  removeNote: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.notes;
      return { notes: rest };
    }),
  upsertPlacedItem: (p) =>
    set((s) => ({ placedItems: { ...s.placedItems, [p.id]: p } })),
  removePlacedItem: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.placedItems;
      return { placedItems: rest };
    }),
  patchPlacedItems: (patches) =>
    set((s) => {
      const next = { ...s.placedItems };
      for (const { id, patch } of patches) {
        const cur = next[id];
        if (cur) next[id] = { ...cur, ...patch };
      }
      return { placedItems: next };
    }),
  upsertShape: (sh) =>
    set((s) => ({ shapes: { ...s.shapes, [sh.id]: sh } })),
  removeShape: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.shapes;
      return { shapes: rest };
    }),
  patchShapes: (patches) =>
    set((s) => {
      const next = { ...s.shapes };
      for (const { id, patch } of patches) {
        const cur = next[id];
        if (cur) next[id] = { ...cur, ...patch };
      }
      return { shapes: next };
    }),
  upsertFrame: (f) =>
    set((s) => ({ frames: { ...s.frames, [f.id]: f } })),
  removeFrame: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.frames;
      return { frames: rest };
    }),
  setScale: (realPerUnit, unit) => set({ scale: { realPerUnit, unit } }),
  setBounds: (b) => set({ bounds: b }),
  setEntities: (entities) => set({ entities, entitiesLoaded: true }),
  upsertDrawing: (d) =>
    set((s) => {
      const drawings = { ...s.drawings, [d.id]: d };
      const { entities, bounds } = recomputeEntities(drawings);
      return {
        drawings,
        entities,
        entitiesLoaded: true,
        bounds: bounds ?? s.bounds,
      };
    }),
  removeDrawing: (id) =>
    set((s) => {
      const { [id]: _, ...drawings } = s.drawings;
      const { entities, bounds } = recomputeEntities(drawings);
      return { drawings, entities, bounds };
    }),
  toggleDrawing: (id) =>
    set((s) => {
      const cur = s.drawings[id];
      if (!cur) return {};
      const drawings = { ...s.drawings, [id]: { ...cur, visible: !cur.visible } };
      const { entities, bounds } = recomputeEntities(drawings);
      return { drawings, entities, bounds: bounds ?? s.bounds };
    }),
  renameDrawing: (id, name) =>
    set((s) => {
      const cur = s.drawings[id];
      if (!cur) return {};
      return { drawings: { ...s.drawings, [id]: { ...cur, name } } };
    }),
  setDrawingTransform: (id, patch) =>
    set((s) => {
      const cur = s.drawings[id];
      if (!cur) return {};
      const next: Drawing = { ...cur, ...patch };
      const drawings = { ...s.drawings, [id]: next };
      const { entities, bounds } = recomputeEntities(drawings);
      return { drawings, entities, bounds: bounds ?? s.bounds };
    }),
  setDrawingOrder: (orderedIds) =>
    set((s) => {
      const next: Record<string, Drawing> = { ...s.drawings };
      orderedIds.forEach((id, i) => {
        const cur = next[id];
        if (cur) next[id] = { ...cur, sortOrder: i };
      });
      const { entities, bounds } = recomputeEntities(next);
      return { drawings: next, entities, bounds: bounds ?? s.bounds };
    }),
  toggleLayer: (k) =>
    set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  toggleGrid: () =>
    set((s) => ({ grid: { ...s.grid, visible: !s.grid.visible } })),
  setGridSize: (mm) =>
    set((s) => ({
      grid: { ...s.grid, sizeMM: Math.max(1, Math.round(mm)) },
    })),
  toggleAspectLock: (id) =>
    set((s) => {
      const cur = { ...s.aspectLockedItems };
      if (cur[id]) delete cur[id];
      else cur[id] = true;
      return { aspectLockedItems: cur };
    }),
}));
