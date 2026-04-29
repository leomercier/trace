"use client";

import { create } from "zustand";
import type { Measurement, Note, PlacedItem } from "@/lib/supabase/types";
import type { Bounds, Pt } from "@/lib/utils/geometry";
import type { Unit } from "@/lib/utils/units";

export type Tool = "select" | "pan" | "measure" | "note" | "calibrate";
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
  selection: { kind: "measurement" | "note" | "placed"; id: string } | null;
  // Additional placed-item selections (multi-select). The primary item lives
  // in `selection`; these are siblings.
  multiSelection: Set<string>;

  // data
  measurements: Record<string, Measurement>;
  notes: Record<string, Note>;
  placedItems: Record<string, PlacedItem>;
  scale: { realPerUnit: number; unit: Unit } | null;
  bounds: Bounds | null;

  // presence
  cursors: Record<string, RemoteCursor>;

  // layers
  layers: { measurements: boolean; notes: boolean; cursors: boolean; items: boolean };

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
  setScale: (realPerUnit: number, unit: Unit) => void;
  setBounds: (b: Bounds) => void;
  setEntities: (entities: ParsedEntity[]) => void;
  upsertDrawing: (d: Drawing) => void;
  removeDrawing: (id: string) => void;
  toggleDrawing: (id: string) => void;
  renameDrawing: (id: string, name: string) => void;
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
  entities: ParsedEntity[];
  bounds: Bounds;
  visible: boolean;
  sortOrder: number;
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
    entities.push(...d.entities);
    if (d.bounds) {
      if (d.bounds.minX < minX) minX = d.bounds.minX;
      if (d.bounds.minY < minY) minY = d.bounds.minY;
      if (d.bounds.maxX > maxX) maxX = d.bounds.maxX;
      if (d.bounds.maxY > maxY) maxY = d.bounds.maxY;
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
  scale: null,
  bounds: null,
  cursors: {},
  layers: { measurements: true, notes: true, cursors: true, items: true },
  grid: { visible: true, sizeMM: 1000 },
  entities: [],
  entitiesLoaded: false,
  drawings: {},

  init: ({ pageId, role, measurements, notes, placedItems, scale, bounds }) =>
    set(() => ({
      pageId,
      role,
      canEdit: role !== "viewer",
      measurements: Object.fromEntries(measurements.map((m) => [m.id, m])),
      notes: Object.fromEntries(notes.map((n) => [n.id, n])),
      placedItems: Object.fromEntries(placedItems.map((p) => [p.id, p])),
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
