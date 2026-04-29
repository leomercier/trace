import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/ai/anthropic";
import { sanitiseSvg } from "@/lib/utils/sanitiseSvg";

const Body = z.object({
  organisation_id: z.string().uuid(),
  imageBase64: z.string(), // raw base64, no data: prefix
  hint: z.string().optional(), // "floor plan", "site outline", etc.
});

export const runtime = "nodejs";

const SYSTEM = `You are a CAD draftsman's assistant. The user gives you a photo or sketch — most often a floor plan or site outline — and you trace the visible structure as a clean 2D SVG suitable for use as the underlay of a measured floor plan.

Return STRICTLY this JSON shape with no preamble or markdown fences:
{ "svg_markup": string, "viewBox": string, "notes": string }

The SVG MUST:
- Use only stroke="#1c1917" and fills of "#fff" or "#f5f5f4" (no other colours).
- Use only <rect>, <circle>, <ellipse>, <line>, <path>, <polygon>, <text>.
- Have a clean viewBox sized to your tracing (e.g. "0 0 1000 800").
- Be self-contained — no <script>, no event handlers, no external references, no <foreignObject>, no fonts.
- Capture only the structural lines: walls, openings, fixed furniture outlines, room boundaries. Skip noise (dimensions, scribbles, labels you can't read).`;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { organisation_id, imageBase64, hint } = parsed.data;

  const { data: mem } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisation_id)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const anthropic = getAnthropic();
  if (!anthropic) {
    return NextResponse.json(
      { error: "AI is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: imageBase64 },
            },
            {
              type: "text",
              text: hint
                ? `Trace this image as a clean SVG outline. Hint: ${hint}.`
                : "Trace this image as a clean SVG outline.",
            },
          ],
        },
      ] as any,
    });

    const text = resp.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    const clean = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let payload: any;
    try {
      payload = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "AI did not return valid JSON" },
        { status: 502 },
      );
    }

    const safe = sanitiseSvg(payload.svg_markup || "");
    if (!safe) {
      return NextResponse.json(
        { error: "AI SVG failed sanitisation" },
        { status: 502 },
      );
    }

    const svc = createServiceClient();
    await svc.from("ai_calls").insert({
      organisation_id,
      user_id: u.user.id,
      endpoint: "image-to-svg",
      input_tokens: resp.usage?.input_tokens ?? null,
      output_tokens: resp.usage?.output_tokens ?? null,
    });

    return NextResponse.json({
      svg: safe,
      viewBox: payload.viewBox || "0 0 1000 800",
      notes: payload.notes || null,
    });
  } catch (err: any) {
    console.error("[ai/image-to-svg]", err);
    return NextResponse.json(
      { error: "AI request failed: " + (err?.message || "unknown error") },
      { status: 502 },
    );
  }
}
