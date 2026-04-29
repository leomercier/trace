import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/ai/anthropic";

const Body = z.object({
  pageId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  canvasSnapshot: z.string().optional(), // base64 PNG (no data: prefix)
  pageContext: z.object({
    fileName: z.string().nullable(),
    measurementCount: z.number(),
    noteCount: z.number(),
    placedItemNames: z.array(z.string()),
    scale: z
      .object({ realPerUnit: z.number(), unit: z.string() })
      .nullable(),
  }),
});

export const runtime = "nodejs";

const SYSTEM = `You are the tracable AI assistant, embedded in a CAD/floor-plan tool. The user is working in a browser canvas with a calibrated drawing.

You can see the canvas via images and you have structured context about what's on the page (counts of measurements, names of placed items, calibration scale).

When the user asks about distances, fit, or layout:
- If a scale is calibrated, give answers in real units (mm/m/ft).
- If no scale is calibrated, say so and recommend calibrating.

When the user asks about visible content:
- Refer to what you can see in the image.
- Be specific about quantities, positions, and relationships.

When suggesting furniture or layout:
- Give specific items with dimensions in mm.
- Describe positions in plain language ("along the north wall, 600mm from the corner").

When the user asks you to ADD, DRAW, PLACE, or otherwise change the canvas, use the provided tools instead of just describing the change in prose. The tools return immediately and the user can accept or revert the proposed changes — you do not need to wait for a result before continuing.

Be concise. One short paragraph max unless specifically asked for more.`;

// Tool schemas — kept minimal so Claude can compose them without tripping on
// edge cases. Coordinates are in DRAWING WORLD units; the client converts to
// real units via the calibrated scale.
const TOOLS: any[] = [
  {
    name: "add_note",
    description:
      "Drop a sticky note onto the canvas at the given world coordinates with the given text.",
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        text: { type: "string" },
      },
      required: ["x", "y", "text"],
    },
  },
  {
    name: "add_measurement",
    description:
      "Add a measurement line between two world points. Length is computed from the calibrated scale.",
    input_schema: {
      type: "object",
      properties: {
        ax: { type: "number" },
        ay: { type: "number" },
        bx: { type: "number" },
        by: { type: "number" },
        label: { type: "string" },
      },
      required: ["ax", "ay", "bx", "by"],
    },
  },
  {
    name: "add_shape",
    description:
      "Add a free-form shape: line, rect, or text. For line, (x,y) is start and (x+w, y+h) is end. For rect/text, (x,y) is top-left.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["line", "rect", "text"] },
        x: { type: "number" },
        y: { type: "number" },
        w: { type: "number" },
        h: { type: "number" },
        text: { type: "string" },
        stroke: { type: "string", description: "hex colour like #1c1917" },
        fill: { type: "string", description: "hex colour or empty for none" },
        stroke_width: { type: "number" },
      },
      required: ["kind", "x", "y", "w", "h"],
    },
  },
];

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { pageId, messages, canvasSnapshot, pageContext } = parsed.data;

  // Verify the user can access this page.
  const { data: page } = await supabase
    .from("pages")
    .select("id, project_id")
    .eq("id", pageId)
    .maybeSingle();
  if (!page) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data: project } = await supabase
    .from("projects")
    .select("organisation_id")
    .eq("id", page.project_id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const anthropic = getAnthropic();
  if (!anthropic) {
    return NextResponse.json(
      {
        error:
          "AI is not configured on the server. Set ANTHROPIC_API_KEY to enable.",
      },
      { status: 503 },
    );
  }

  // Build context string
  const ctx = [
    pageContext.fileName ? `Page file: ${pageContext.fileName}` : "Page has no source drawing yet",
    `${pageContext.measurementCount} measurement${pageContext.measurementCount === 1 ? "" : "s"}`,
    `${pageContext.noteCount} note${pageContext.noteCount === 1 ? "" : "s"}`,
    pageContext.placedItemNames.length > 0
      ? `Placed items (${pageContext.placedItemNames.length}): ${pageContext.placedItemNames.slice(0, 20).join(", ")}`
      : "No items placed yet",
    pageContext.scale
      ? `Scale: 1 drawing-unit = ${pageContext.scale.realPerUnit} ${pageContext.scale.unit}`
      : "Scale: NOT CALIBRATED — distances cannot be reported in real units",
  ].join("\n");

  // Build the multimodal user message
  const lastUser = messages[messages.length - 1];
  const priorTurns = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const lastUserContent: any[] = [];
  if (canvasSnapshot) {
    lastUserContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: canvasSnapshot,
      },
    });
  }
  lastUserContent.push({
    type: "text",
    text: `Context:\n${ctx}\n\nUser question: ${lastUser.content}`,
  });

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM,
      tools: TOOLS,
      messages: [
        ...priorTurns,
        { role: "user", content: lastUserContent },
      ] as any,
    } as any);

    const text = resp.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    // Tool calls become "proposed actions" the UI can apply or discard.
    const actions = resp.content
      .filter((b: any) => b.type === "tool_use")
      .map((b: any) => ({
        id: b.id,
        name: b.name,
        input: b.input,
      }));

    const svc = createServiceClient();
    await svc.from("ai_calls").insert({
      organisation_id: project.organisation_id,
      user_id: u.user.id,
      endpoint: "canvas-chat",
      input_tokens: resp.usage?.input_tokens ?? null,
      output_tokens: resp.usage?.output_tokens ?? null,
    });

    return NextResponse.json({ reply: text, actions });
  } catch (err: any) {
    console.error("[ai/canvas-chat]", err);
    return NextResponse.json(
      { error: "AI request failed: " + (err?.message || "unknown error") },
      { status: 502 },
    );
  }
}
