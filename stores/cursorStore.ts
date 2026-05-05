"use client";

import { create } from "zustand";
import type { RemoteCursor } from "./editorStore";

/**
 * Remote-cursor presence lives in its own store so the ~30 Hz broadcast
 * traffic doesn't fan out to panel components subscribed to the main
 * editor store. Only the canvas's CursorLayer reads from here.
 */
interface CursorState {
  cursors: Record<string, RemoteCursor>;
  upsertCursor: (c: RemoteCursor) => void;
  removeCursor: (userId: string) => void;
  clear: () => void;
}

export const useCursors = create<CursorState>((set) => ({
  cursors: {},
  upsertCursor: (c) =>
    set((s) => ({ cursors: { ...s.cursors, [c.userId]: c } })),
  removeCursor: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.cursors;
      return { cursors: rest };
    }),
  clear: () => set({ cursors: {} }),
}));
