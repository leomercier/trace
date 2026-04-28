import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/ai/anthropic";
import { sanitiseSvg } from "@/lib/utils/sanitiseSvg";
import type { InventoryItem } from "@/lib/supabase/types";

const Body = z.object({
  query: z.string().min(2).max(120),
  organisation_id: z.string().uuid(),
});

export const runtime = "nodejs";

const SYSTEM = `You are a furniture and fixtures sourcing assistant for a CAD/floor-plan tool.
Given a product search query, return 1–3 plausible products that match.

For each product provide:
- The product name
- Brand or manufacturer (or null)
- Approximate price in GBP as text like "£4,890" (or null if unknown)
- Width, depth, and height in millimetres (top-down floor plan dimensions)
- A 2D top-down SVG silhouette suitable for a floor plan, normalised to a 100×100 viewBox.

The SVG MUST:
- Use stroke="#1c1917" and fills of "#fff" or "#f5f5f4" only
- Use only <rect>, <circle>, <ellipse>, <line>, <path>, <polygon>, <text>
- Have preserveAspectRatio="none"
- Be self-contained, no <script>, no event handlers, no external references, no <foreignObject>

Return STRICTLY this JSON shape with no preamble or markdown fences:
{
  "results": [
    {
      "name": string,
      "brand": string | null,
      "price_text": string | null,
      "width_mm": number,
      "depth_mm": number,
      "height_mm": number,
      "source_url": string | null,
      "svg_markup": string
    }
  ]
}`;

interface AIResult {
  name: string;
  brand: string | null;
  price_text: string | null;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  source_url: string | null;
  svg_markup: string;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { query, organisation_id } = parsed.data;

  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisation_id)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const svc = createServiceClient();

  // Cache: AI items for this org with this query, < 30 days old.
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: cached } = await svc
    .from("inventory_items")
    .select("*")
    .eq("organisation_id", organisation_id)
    .eq("source", "ai")
    .eq("query", query.toLowerCase())
    .gt("created_at", since)
    .limit(3);
  if (cached && cached.length > 0) {
    return NextResponse.json({ results: cached as InventoryItem[], cached: true });
  }

  const anthropic = getAnthropic();
  if (!anthropic) {
    return NextResponse.json(
      {
        error:
          "AI is not configured on the server. Set ANTHROPIC_API_KEY in environment to enable AI search.",
      },
      { status: 503 },
    );
  }

  let aiResults: AIResult[] = [];
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [
        { role: "user", content: `Search query: "${query}"` },
      ],
    });
    const text = resp.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    // Strip markdown fences if present
    const clean = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed.results)) throw new Error("no results array");
    aiResults = parsed.results as AIResult[];

    // Log usage
    await svc.from("ai_calls").insert({
      organisation_id,
      user_id: u.user.id,
      endpoint: "product-search",
      input_tokens: resp.usage?.input_tokens ?? null,
      output_tokens: resp.usage?.output_tokens ?? null,
      cache_hit: false,
    });
  } catch (err: any) {
    console.error("[ai/product-search]", err);
    return NextResponse.json(
      { error: "AI search failed: " + (err?.message || "unknown error") },
      { status: 502 },
    );
  }

  // Sanitise + persist
  const saved: InventoryItem[] = [];
  for (const r of aiResults) {
    const cleanSvg = sanitiseSvg(r.svg_markup);
    if (!cleanSvg) continue;
    if (![r.width_mm, r.depth_mm, r.height_mm].every((n) => Number.isFinite(n) && n > 0)) continue;
    const { data, error } = await svc
      .from("inventory_items")
      .insert({
        organisation_id,
        source: "ai",
        name: r.name?.slice(0, 200) || query,
        brand: r.brand?.slice(0, 120) || null,
        price_text: r.price_text?.slice(0, 40) || null,
        width_mm: Math.round(r.width_mm),
        depth_mm: Math.round(r.depth_mm),
        height_mm: Math.round(r.height_mm),
        svg_markup: cleanSvg,
        source_url: r.source_url?.slice(0, 500) || null,
        query: query.toLowerCase(),
        created_by: u.user.id,
      })
      .select("*")
      .single();
    if (!error && data) saved.push(data as InventoryItem);
  }

  return NextResponse.json({ results: saved, cached: false });
}
