"use client";

import { createClient } from "@/lib/supabase/client";
import type { Measurement, Note, Page, PlacedItem, Shape } from "@/lib/supabase/types";
import type { RealtimeBatch, Tool } from "@/stores/editorStore";

type PostgresKind = "INSERT" | "UPDATE" | "DELETE";

export interface CursorMessage {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  tool: Tool;
}

export interface DraftMessage {
  userId: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface SubscribeArgs {
  pageId: string;
  userId: string;
  userName: string;
  /**
   * Coalesced batch of postgres-changes for measurements/notes/items/shapes,
   * flushed at most once per `requestAnimationFrame`. Per-row last-event-wins
   * so a burst of 50 inserts arrives as one React render, not 50.
   */
  onBatch: (batch: RealtimeBatch) => void;
  onPageUpdate: (p: Page) => void;
  onCursor: (c: CursorMessage) => void;
  onPresence: (
    users: { userId: string; name: string; color: string }[],
  ) => void;
}

type Table = "measurements" | "notes" | "placedItems" | "shapes";
type Row = Measurement | Note | PlacedItem | Shape;
type PendingEvent =
  | { kind: "upsert"; row: Row }
  | { kind: "delete" };

export function subscribePage(args: SubscribeArgs) {
  const supabase = createClient();
  const channel = supabase.channel(`page:${args.pageId}`, {
    config: { presence: { key: args.userId } },
  });

  // Per-table pending map. Keyed by row id so the latest event wins for
  // any given row — that's enough to be correct for INSERT→DELETE,
  // UPDATE→UPDATE, etc. coalescing.
  const pending: Record<Table, Map<string, PendingEvent>> = {
    measurements: new Map(),
    notes: new Map(),
    placedItems: new Map(),
    shapes: new Map(),
  };
  let rafHandle: number | null = null;

  function schedule(table: Table, id: string, event: PendingEvent) {
    pending[table].set(id, event);
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(flush);
  }

  function flush() {
    rafHandle = null;
    const batch: RealtimeBatch = {};
    for (const table of ["measurements", "notes", "placedItems", "shapes"] as const) {
      const map = pending[table];
      if (map.size === 0) continue;
      const upserts: Row[] = [];
      const deletes: string[] = [];
      for (const [id, ev] of map) {
        if (ev.kind === "delete") deletes.push(id);
        else upserts.push(ev.row);
      }
      map.clear();
      // The cast is safe because each table's map is populated with rows
      // of its own row type below.
      batch[table] = { upserts: upserts as any, deletes };
    }
    args.onBatch(batch);
  }

  function record(table: Table, payload: any) {
    const row = (payload.new ?? payload.old) as Row | undefined;
    if (!row) return;
    if (payload.eventType === "DELETE") {
      schedule(table, row.id, { kind: "delete" });
    } else {
      schedule(table, row.id, { kind: "upsert", row });
    }
  }

  channel
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "measurements", filter: `page_id=eq.${args.pageId}` },
      (payload: any) => record("measurements", payload),
    )
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "notes", filter: `page_id=eq.${args.pageId}` },
      (payload: any) => record("notes", payload),
    )
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "placed_items", filter: `page_id=eq.${args.pageId}` },
      (payload: any) => record("placedItems", payload),
    )
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "shapes", filter: `page_id=eq.${args.pageId}` },
      (payload: any) => record("shapes", payload),
    )
    .on(
      "postgres_changes" as any,
      { event: "UPDATE", schema: "public", table: "pages", filter: `id=eq.${args.pageId}` },
      (payload: any) => {
        if (payload.new) args.onPageUpdate(payload.new as Page);
      },
    )
    .on("broadcast", { event: "cursor" }, (payload: any) => {
      const m = payload.payload as CursorMessage;
      args.onCursor(m);
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users: { userId: string; name: string; color: string }[] = [];
      for (const key in state) {
        const arr = state[key] as any[];
        for (const p of arr) {
          users.push({ userId: key, name: p.name, color: p.color });
        }
      }
      args.onPresence(users);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ name: args.userName, color: stringToColor(args.userId) });
      }
    });

  // Wrap the channel's unsubscribe so any in-flight RAF flush runs first
  // (don't drop a final batch that postgres-changes already committed).
  const origUnsubscribe = channel.unsubscribe.bind(channel);
  (channel as any).unsubscribe = () => {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
      flush();
    }
    return origUnsubscribe();
  };

  return channel;
}

export async function broadcastCursor(pageId: string, c: CursorMessage) {
  const supabase = createClient();
  const ch = supabase
    .getChannels()
    .find((c) => c.topic === `realtime:page:${pageId}` || c.topic === `page:${pageId}`);
  if (!ch) return;
  ch.send({ type: "broadcast", event: "cursor", payload: c });
}

export async function broadcastDraft(pageId: string, d: DraftMessage) {
  const supabase = createClient();
  const ch = supabase
    .getChannels()
    .find((c) => c.topic === `realtime:page:${pageId}` || c.topic === `page:${pageId}`);
  if (!ch) return;
  ch.send({ type: "broadcast", event: "draft", payload: d });
}

function stringToColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const palette = ["#dc2626", "#0891b2", "#7c3aed", "#16a34a", "#d97706", "#0ea5e9", "#be123c"];
  return palette[Math.abs(h) % palette.length];
}

// Re-export the kind so existing imports in unrelated callers keep
// working. Internal to this file we no longer route by kind because
// the buffer collapses by id.
export type { PostgresKind };
