"use client";

import { create } from "zustand";
import type { Measurement, Note, PlacedItem, Shape } from "@/lib/supabase/types";
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
  | "text";
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
    | { kind: "measurement" | "note" | "placed" | "shape" | "drawing"; id: string }
    | null;
  // Additional placed-item selections (multi-select). The primary item lives
  // in `selection`; these are siblings.
  multiSelection: Set<string>;

  // data
  measurements: Record<string, Measurement>;
  notes: Record<string, Note>;
  placedItems: Record<string, PlacedItem>;
  shapes: Record<string, Shape>;
  scale: { realPerUnit: number; unit: Unit } | null;
  bounds: Bounds | null;

  // presence
  cursors: Record<string, RemoteCursor>;

  // layers
  layers: {
    measurements: boolean;
    notes: boolean;
    cursors: boolean;
    items: boolean;
    shapes: boolean;
  };

  // grid
  grid: { visible: boolean; sizeMM: number };

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
  upsertShape: (s: Shape) => void;
  removeShape: (id: string) => void;
  setScale: (realPerUnit: number, unit: Unit) => void;
  setBounds: (b: Bounds) => void;
  setEntities: (entities: ParsedEntity[]) => void;
  upsertDrawing: (d: Drawing) => void;
  removeDrawing: (id: string) => void;
  toggleDrawing: (id: string) => void;
  renameDrawing: (id: string, name: string) => void;
  setDrawingTransform: (
    id: string,
    t: Partial<Pick<Drawing, "x" | "y" | "scale" | "rotation">>,
  ) => void;
  setDrawingLocked: (id: string, locked: boolean) => void;
  upsertCursor: (c: RemoteCursor) => void;
  removeCursor: (userId: string) => void;
  toggleLayer: (k: keyof EditorState["layers"]) => void;
  toggleGrid: () => void;
  setGridSize: (mm: number) => void;
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
  entities: ParsedEntity[];   // native (un-transformed) coords from the parser
  bounds: Bounds;             // native bounds
  visible: boolean;
  sortOrder: number;
  // Per-drawing transform (origin = drawing's natural centre).
  // Defaults are identity so untouched drawings render unchanged.
  x: number;          // translate x
  y: number;          // translate y
  scale: number;      // uniform scale, default 1
  rotation: number;   // degrees, default 0
  locked: boolean;    // when true, can't be moved/resized/rotated/deleted
}

/**
 * Apply a drawing's transform (translate around natural centre, scale,
 * rotate) to a single entity. Returns a fresh entity in world coords —
 * used both for rendering (DrawingLayer) and for the snap index so that
 * vertices stay snappable after the user moves a layer.
 */
export function transformEntity(e: ParsedEntity, d: Drawing): ParsedEntity {
  const s = d.scale || 1;
  const r = ((d.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const cx = (d.bounds.minX + d.bounds.maxX) / 2;
  const cy = (d.bounds.minY + d.bounds.maxY) / 2;
  const tx = d.x || 0;
  const ty = d.y || 0;
  const tp = (px: number, py: number) => {
    const lx = (px - cx) * s;
    const ly = (py - cy) * s;
    return {
      x: cx + cos * lx - sin * ly + tx,
      y: cy + sin * lx + cos * ly + ty,
    };
  };
  switch (e.kind) {
    case "line": {
      const a = tp(e.ax, e.ay);
      const b = tp(e.bx, e.by);
      return { kind: "line", ax: a.x, ay: a.y, bx: b.x, by: b.y, color: e.color };
    }
    case "polyline": {
      const out = new Array(e.points.length);
      for (let i = 0; i < e.points.length; i += 2) {
        const p = tp(e.points[i], e.points[i + 1]);
        out[i] = p.x;
        out[i + 1] = p.y;
      }
      return { kind: "polyline", points: out, color: e.color, closed: e.closed };
    }
    case "circle": {
      const c = tp(e.cx, e.cy);
      return { kind: "circle", cx: c.x, cy: c.y, r: e.r * s, color: e.color };
    }
    case "arc": {
      const c = tp(e.cx, e.cy);
      return {
        kind: "arc",
        cx: c.x,
        cy: c.y,
        r: e.r * s,
        start: e.start + r,
        end: e.end + r,
        color: e.color,
      };
    }
    case "text": {
      const p = tp(e.x, e.y);
      return { kind: "text", x: p.x, y: p.y, size: e.size * s, text: e.text, color: e.color };
    }
    case "image": {
      // Translate + scale around the drawing's natural centre. Rotation on
      // raster images isn't supported by DrawingLayer's sprite renderer
      // today; we keep the image axis-aligned and only apply translate +
      // scale here. (Ship a dedicated sprite container in a follow-up.)
      const p = tp(e.x + e.w / 2, e.y + e.h / 2);
      const w = e.w * s;
      const h = e.h * s;
      return { kind: "image", x: p.x - w / 2, y: p.y - h / 2, w, h, src: e.src };
    }
  }
}

/**
 * World-space axis-aligned bounding box of a drawing after transform.
 * Used for the selection outline + hit testing (we hit-test in the
 * drawing's local frame so rotation works correctly — see worldToLocal
 * below).
 */
export function drawingWorldBounds(d: Drawing): Bounds {
  const s = d.scale || 1;
  const cx = (d.bounds.minX + d.bounds.maxX) / 2;
  const cy = (d.bounds.minY + d.bounds.maxY) / 2;
  const w = (d.bounds.maxX - d.bounds.minX) * s;
  const h = (d.bounds.maxY - d.bounds.minY) * s;
  const r = ((d.rotation || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  const aabbW = w * cos + h * sin;
  const aabbH = w * sin + h * cos;
  const wcx = cx + (d.x || 0);
  const wcy = cy + (d.y || 0);
  return {
    minX: wcx - aabbW / 2,
    minY: wcy - aabbH / 2,
    maxX: wcx + aabbW / 2,
    maxY: wcy + aabbH / 2,
  };
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
    const identity = !d.x && !d.y && (d.scale || 1) === 1 && !(d.rotation || 0);
    if (identity) {
      entities.push(...d.entities);
    } else {
      for (const e of d.entities) entities.push(transformEntity(e, d));
    }
    const wb = drawingWorldBounds(d);
    if (wb.minX < minX) minX = wb.minX;
    if (wb.minY < minY) minY = wb.minY;
    if (wb.maxX > maxX) maxX = wb.maxX;
    if (wb.maxY > maxY) maxY = wb.maxY;
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
  scale: null,
  bounds: null,
  cursors: {},
  layers: { measurements: true, notes: true, cursors: true, items: true, shapes: true },
  grid: { visible: true, sizeMM: 1000 },
  entities: [],
  entitiesLoaded: false,
  drawings: {},

  init: ({ pageId, role, measurements, notes, placedItems, shapes, scale, bounds }) =>
    set(() => ({
      pageId,
      role,
      canEdit: role !== "viewer",
      measurements: Object.fromEntries(measurements.map((m) => [m.id, m])),
      notes: Object.fromEntries(notes.map((n) => [n.id, n])),
      placedItems: Object.fromEntries(placedItems.map((p) => [p.id, p])),
      shapes: Object.fromEntries(shapes.map((s) => [s.id, s])),
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
  upsertShape: (sh) =>
    set((s) => ({ shapes: { ...s.shapes, [sh.id]: sh } })),
  removeShape: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.shapes;
      return { shapes: rest };
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
  setDrawingTransform: (id, t) =>
    set((s) => {
      const cur = s.drawings[id];
      if (!cur) return {};
      const next: Drawing = {
        ...cur,
        x: t.x ?? cur.x,
        y: t.y ?? cur.y,
        scale: t.scale ?? cur.scale,
        rotation: t.rotation ?? cur.rotation,
      };
      const drawings = { ...s.drawings, [id]: next };
      const { entities, bounds } = recomputeEntities(drawings);
      return { drawings, entities, bounds: bounds ?? s.bounds };
    }),
  setDrawingLocked: (id, locked) =>
    set((s) => {
      const cur = s.drawings[id];
      if (!cur) return {};
      return { drawings: { ...s.drawings, [id]: { ...cur, locked } } };
    }),
  upsertCursor: (c) =>
    set((s) => ({ cursors: { ...s.cursors, [c.userId]: c } })),
  removeCursor: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.cursors;
      return { cursors: rest };
    }),
  toggleLayer: (k) =>
    set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  toggleGrid: () =>
    set((s) => ({ grid: { ...s.grid, visible: !s.grid.visible } })),
  setGridSize: (mm) =>
    set((s) => ({
      grid: { ...s.grid, sizeMM: Math.max(1, Math.round(mm)) },
    })),
}));
