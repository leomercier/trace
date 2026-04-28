"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, Sparkles, Loader2, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InventoryItem } from "@/lib/supabase/types";
import { CATEGORIES } from "@/lib/inventory/svg";

const C = {
  ai: "var(--ai, #7c3aed)",
};

export function InventoryDrawer({
  open,
  onClose,
  orgId,
  hasScale,
  onPlace,
  onDragStart,
  onDragEnd,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  hasScale: boolean;
  onPlace: (item: InventoryItem) => void;
  onDragStart: (item: InventoryItem) => void;
  onDragEnd: () => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [aiResults, setAiResults] = useState<InventoryItem[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      // Defaults (organisation_id is null) plus this org's AI/manual items.
      const { data } = await supabase
        .from("inventory_items")
        .select("*")
        .or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (!cancelled) setItems((data || []) as InventoryItem[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orgId, supabase]);

  const filtered = useMemo(() => {
    let xs = items;
    if (category !== "All") xs = xs.filter((i) => i.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      xs = xs.filter((i) => i.name.toLowerCase().includes(q));
    }
    return xs;
  }, [items, category, search]);

  async function runAiSearch() {
    if (!search.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiResults(null);
    try {
      const res = await fetch("/api/ai/product-search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: search.trim(), organisation_id: orgId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiError(json.error || "AI search failed.");
      } else {
        setAiResults(json.results || []);
        // Refresh inventory to include the just-saved AI items
        if (json.results?.length) setItems((s) => [...json.results, ...s]);
      }
    } catch {
      setAiError("Network error.");
    } finally {
      setAiLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end md:items-stretch md:justify-end bg-black/30 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-panel shadow-lg md:h-full md:max-w-[460px] md:rounded-none md:rounded-l-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Package size={18} />
            <h2 className="font-serif text-xl">Inventory</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setAiResults(null);
                setAiError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runAiSearch();
              }}
              placeholder="Search default items, or ask AI for any product…"
              className="h-10 w-full rounded-md border border-border bg-panel pl-9 pr-28 text-sm placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
            <button
              onClick={runAiSearch}
              disabled={!search.trim() || aiLoading}
              className="absolute right-1 top-1 flex h-8 items-center gap-1 rounded px-3 text-xs font-medium disabled:cursor-not-allowed"
              style={{
                background: search.trim() && !aiLoading ? "#7c3aed" : "var(--panel-muted)",
                color: search.trim() && !aiLoading ? "#fff" : "var(--ink-faint)",
              }}
              title="AI product search"
            >
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AI search
            </button>
          </div>
          {!hasScale ? (
            <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-[11px] text-ink-muted">
              Calibrate the page scale for items to size correctly to the drawing.
            </div>
          ) : null}
          {aiError ? (
            <div className="mt-3 text-xs text-measure">{aiError}</div>
          ) : null}
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-5 py-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                category === c ? "bg-ink text-white" : "bg-panel-muted text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {aiResults && aiResults.length > 0 ? (
            <section className="mb-6">
              <SectionLabel>
                <Sparkles size={11} style={{ color: "#7c3aed" }} /> AI suggestions for &ldquo;{search}&rdquo;
              </SectionLabel>
              <Grid>
                {aiResults.map((r) => (
                  <Tile
                    key={r.id}
                    item={r}
                    onPlace={onPlace}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    accent
                  />
                ))}
              </Grid>
            </section>
          ) : null}

          {filtered.length === 0 && !aiLoading ? (
            <div className="py-12 text-center text-sm text-ink-muted">
              {search ? "No matches. Try AI search." : "No items in this category."}
            </div>
          ) : null}

          <Grid>
            {filtered.map((it) => (
              <Tile
                key={it.id}
                item={it}
                onPlace={onPlace}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                accent={it.source === "ai"}
              />
            ))}
          </Grid>
        </div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-2">{children}</div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
      {children}
    </div>
  );
}

function Tile({
  item,
  onPlace,
  onDragStart,
  onDragEnd,
  accent,
}: {
  item: InventoryItem;
  onPlace: (i: InventoryItem) => void;
  onDragStart: (i: InventoryItem) => void;
  onDragEnd: () => void;
  accent?: boolean;
}) {
  return (
    <button
      draggable
      onDragStart={(e) => {
        onDragStart(item);
        const ghost = document.createElement("div");
        ghost.style.opacity = "0";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onPlace(item)}
      className="flex flex-col gap-2 rounded-md border p-2.5 text-left transition-colors hover:border-border-strong"
      style={{
        background: accent ? "#f0fdf4" : "var(--panel-muted)",
        borderColor: accent ? "#86efac" : "var(--border)",
      }}
    >
      <div className="aspect-square overflow-hidden rounded bg-canvas">
        <div
          dangerouslySetInnerHTML={{ __html: item.svg_markup }}
          className="m-auto flex h-full w-full items-center justify-center"
          style={{ padding: 12 }}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">{item.name}</div>
        <div className="font-num text-[10px] text-ink-muted">
          {item.width_mm}×{item.depth_mm}×{item.height_mm}mm
        </div>
        {item.brand ? (
          <div className="mt-0.5 truncate text-[10px] text-ink-faint">
            {item.brand}
            {item.price_text ? ` · ${item.price_text}` : ""}
          </div>
        ) : null}
      </div>
    </button>
  );
}
