"use client";

import { createClient } from "@/lib/supabase/client";
import type { Measurement, Note, Page, PlacedItem } from "@/lib/supabase/types";
import type { Tool } from "@/stores/editorStore";

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
  onMeasurement: (m: Measurement, kind: PostgresKind) => void;
  onNote: (n: Note, kind: PostgresKind) => void;
  onPlacedItem: (p: PlacedItem, kind: PostgresKind) => void;
  onPageUpdate: (p: Page) => void;
  onCursor: (c: CursorMessage) => void;
  onPresence: (
    users: { userId: string; name: string; color: string }[],
  ) => void;
}

export function subscribePage(args: SubscribeArgs) {
  const supabase = createClient();
  const channel = supabase.channel(`page:${args.pageId}`, {
    config: { presence: { key: args.userId } },
  });

  channel
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "measurements", filter: `page_id=eq.${args.pageId}` },
      (payload: any) => {
        const row = (payload.new ?? payload.old) as Measurement;
        if (row) args.onMeasurement(row, payload.eventType);
      },
    )
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "notes", filter: `page_id=eq.${args.pageId}` },
      (payload: any) => {
        const row = (payload.new ?? payload.old) as Note;
        if (row) args.onNote(row, payload.eventType);
      },
    )
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "placed_items", filter: `page_id=eq.${args.pageId}` },
      (payload: any) => {
        const row = (payload.new ?? payload.old) as PlacedItem;
        if (row) args.onPlacedItem(row, payload.eventType);
      },
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
