"use client";

import { create } from "zustand";
import type { Measurement, Note } from "@/lib/supabase/types";
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
  selection: { kind: "measurement" | "note"; id: string } | null;

  // data
  measurements: Record<string, Measurement>;
  notes: Record<string, Note>;
  scale: { realPerUnit: number; unit: Unit } | null;
  bounds: Bounds | null;

  // presence
  cursors: Record<string, RemoteCursor>;

  // layers
  layers: { measurements: boolean; notes: boolean; cursors: boolean };

  // drawing entities (parsed from source file). Live in memory only.
  entities: ParsedEntity[];
  entitiesLoaded: boolean;

  // actions
  init: (args: {
    pageId: string;
    role: Role;
    measurements: Measurement[];
    notes: Note[];
    scale: { realPerUnit: number; unit: Unit } | null;
    bounds: Bounds | null;
  }) => void;
  setTool: (t: Tool) => void;
  setDraft: (d: EditorState["draft"]) => void;
  setSelection: (s: EditorState["selection"]) => void;
  setView: (v: Partial<EditorState["view"]>) => void;
  upsertMeasurement: (m: Measurement) => void;
  removeMeasurement: (id: string) => void;
  upsertNote: (n: Note) => void;
  removeNote: (id: string) => void;
  setScale: (realPerUnit: number, unit: Unit) => void;
  setBounds: (b: Bounds) => void;
  setEntities: (entities: ParsedEntity[]) => void;
  upsertCursor: (c: RemoteCursor) => void;
  removeCursor: (userId: string) => void;
  toggleLayer: (k: keyof EditorState["layers"]) => void;
}

export type ParsedEntity =
  | { kind: "line"; ax: number; ay: number; bx: number; by: number; color?: number }
  | { kind: "polyline"; points: number[]; color?: number; closed?: boolean }
  | { kind: "circle"; cx: number; cy: number; r: number; color?: number }
  | { kind: "arc"; cx: number; cy: number; r: number; start: number; end: number; color?: number }
  | { kind: "text"; x: number; y: number; size: number; text: string; color?: number }
  | { kind: "image"; x: number; y: number; w: number; h: number; src: string };

export const useEditor = create<EditorState>((set) => ({
  pageId: null,
  role: "viewer",
  canEdit: false,
  view: { x: 0, y: 0, zoom: 1 },
  tool: "select",
  draft: null,
  selection: null,
  measurements: {},
  notes: {},
  scale: null,
  bounds: null,
  cursors: {},
  layers: { measurements: true, notes: true, cursors: true },
  entities: [],
  entitiesLoaded: false,

  init: ({ pageId, role, measurements, notes, scale, bounds }) =>
    set(() => ({
      pageId,
      role,
      canEdit: role !== "viewer",
      measurements: Object.fromEntries(measurements.map((m) => [m.id, m])),
      notes: Object.fromEntries(notes.map((n) => [n.id, n])),
      scale,
      bounds,
      tool: role !== "viewer" ? "measure" : "pan",
    })),

  setTool: (t) => set({ tool: t, draft: null }),
  setDraft: (d) => set({ draft: d }),
  setSelection: (s) => set({ selection: s }),
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
  setScale: (realPerUnit, unit) => set({ scale: { realPerUnit, unit } }),
  setBounds: (b) => set({ bounds: b }),
  setEntities: (entities) => set({ entities, entitiesLoaded: true }),
  upsertCursor: (c) =>
    set((s) => ({ cursors: { ...s.cursors, [c.userId]: c } })),
  removeCursor: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.cursors;
      return { cursors: rest };
    }),
  toggleLayer: (k) =>
    set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
}));
