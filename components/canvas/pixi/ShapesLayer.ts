import * as PIXI from "pixi.js";
import type { Shape } from "@/lib/supabase/types";
import type { Viewport } from "./Viewport";
import { HANDLE_PX, HANDLE_WHITE, SELECTION_BLUE } from "./selection";

const SELECTION_COLOR = SELECTION_BLUE;

function hexToNum(hex: string | null | undefined, fallback: number = 0x1c1917): number {
  if (!hex) return fallback;
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Renders free-form shapes (line, rect, text). Rect+line use Pixi Graphics.
 * Text uses PIXI.Text and is counter-scaled if you want screen-fixed sizes —
 * for v1 we render text at world-units to match the rectangles you draw it in.
 */
export class ShapesLayer extends PIXI.Container {
  private gfx = new PIXI.Graphics();
  private texts = new Map<string, PIXI.Text>();
  private selectionGfx = new PIXI.Graphics();

  constructor(private viewport: Viewport) {
    super();
    this.label = "shapes";
    this.eventMode = "passive";
    this.addChild(this.gfx);
    this.addChild(this.selectionGfx);
  }

  render(shapes: Shape[], selectionId: string | null) {
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;
    this.gfx.clear();

    // Track which texts are still alive so we can remove stale ones.
    const seen = new Set<string>();
    const sorted = [...shapes].sort(
      (a, b) =>
        Number(a.z_order ?? 0) - Number(b.z_order ?? 0) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    for (const s of sorted) {
      seen.add(s.id);
      const stroke = hexToNum(s.stroke, 0x1c1917);
      const fill = s.fill ? hexToNum(s.fill, 0xffffff) : null;
      const sw = Math.max(0.5, Number(s.stroke_width ?? 2));
      const strokeAlpha = clamp01(Number(s.stroke_opacity ?? 1));
      const fillAlpha = clamp01(Number(s.fill_opacity ?? 1));

      if (s.kind === "line") {
        const ax = Number(s.x);
        const ay = Number(s.y);
        const bx = ax + Number(s.w);
        const by = ay + Number(s.h);
        this.gfx
          .moveTo(ax, ay)
          .lineTo(bx, by)
          .stroke({ color: stroke, width: px(sw), alpha: strokeAlpha });
      } else if (s.kind === "rect") {
        const x = Number(s.x);
        const y = Number(s.y);
        const w = Number(s.w);
        const h = Number(s.h);
        this.gfx.rect(x, y, w, h);
        if (fill !== null) this.gfx.fill({ color: fill, alpha: fillAlpha });
        if (sw > 0 && strokeAlpha > 0) {
          this.gfx.stroke({ color: stroke, width: px(sw), alpha: strokeAlpha });
        }
      } else if (s.kind === "text") {
        const txtNode = this.getOrCreateText(s);
        txtNode.position.set(Number(s.x), Number(s.y));
        seen.add(s.id);
      }
    }

    // Remove stale text nodes
    for (const [id, node] of this.texts) {
      if (!seen.has(id)) {
        node.destroy({ children: true });
        this.texts.delete(id);
      }
    }

    // Selection outline
    this.selectionGfx.clear();
    if (selectionId) {
      const sel = sorted.find((s) => s.id === selectionId);
      if (sel) {
        let bx = 0,
          by = 0,
          bw = 0,
          bh = 0;
        if (sel.kind === "line") {
          bx = Math.min(Number(sel.x), Number(sel.x) + Number(sel.w)) - px(4);
          by = Math.min(Number(sel.y), Number(sel.y) + Number(sel.h)) - px(4);
          bw = Math.abs(Number(sel.w)) + px(8);
          bh = Math.abs(Number(sel.h)) + px(8);
        } else {
          bx = Number(sel.x);
          by = Number(sel.y);
          bw = Number(sel.w);
          bh = Number(sel.h);
        }
        this.selectionGfx
          .rect(bx, by, bw, bh)
          .stroke({
            color: SELECTION_COLOR,
            width: px(1.5),
            alpha: 1,
          });
        // Four corner handles. The drag math (Inspector + canvas
        // helpers) currently treats the BR handle as the live one;
        // the others are visual indicators that the selection is
        // resizable, matching the Figma-style design language.
        const corners: [number, number][] = [
          [bx, by],
          [bx + bw, by],
          [bx, by + bh],
          [bx + bw, by + bh],
        ];
        for (const [hx, hy] of corners) {
          this.selectionGfx
            .rect(
              hx - px(HANDLE_PX / 2),
              hy - px(HANDLE_PX / 2),
              px(HANDLE_PX),
              px(HANDLE_PX),
            )
            .fill(HANDLE_WHITE)
            .stroke({ color: SELECTION_COLOR, width: px(1.5) });
        }
      }
    }
    this.setChildIndex(this.selectionGfx, this.children.length - 1);
  }

  drawDraft(
    kind: "line" | "rect" | "text" | null,
    a: { x: number; y: number } | null,
    b: { x: number; y: number } | null,
  ) {
    // Reuse the selection graphics object as a transient draft layer.
    this.selectionGfx.clear();
    if (!kind || !a || !b) return;
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;
    if (kind === "line") {
      this.selectionGfx
        .moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ color: 0x1c1917, width: px(2), alpha: 0.6 });
    } else {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      this.selectionGfx
        .rect(x, y, w, h)
        .stroke({
          color: 0x1c1917,
          width: px(1.5),
          alpha: 0.7,
        });
    }
  }

  private getOrCreateText(s: Shape): PIXI.Text {
    let node = this.texts.get(s.id);
    const style = s.style || {};
    const fontFamily = style.font || "Inter";
    const fontSize = Math.max(4, style.size || 24);
    const fill = hexToNum(style.color || s.stroke, 0x1c1917);
    const fontWeight = style.bold ? "600" : "400";
    const fontStyle = style.italic ? "italic" : "normal";
    if (!node) {
      node = new PIXI.Text({
        text: s.text || "",
        style: { fontFamily, fontSize, fill, fontWeight, fontStyle },
      });
      this.addChildAt(node, this.children.length - 1);
      this.texts.set(s.id, node);
    } else {
      node.text = s.text || "";
      node.style.fontFamily = fontFamily;
      node.style.fontSize = fontSize;
      node.style.fill = fill as any;
      node.style.fontWeight = fontWeight as any;
      node.style.fontStyle = fontStyle as any;
    }
    return node;
  }

  hitTest(shapes: Shape[], wx: number, wy: number): string | null {
    const z = this.viewport.zoom || 1;
    const tol = 6 / z;
    // iterate topmost first
    const sorted = [...shapes].sort(
      (a, b) =>
        Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    for (const s of sorted) {
      if (s.kind === "line") {
        const ax = Number(s.x);
        const ay = Number(s.y);
        const bx = ax + Number(s.w);
        const by = ay + Number(s.h);
        const d2 = pointSegDist2(wx, wy, ax, ay, bx, by);
        if (d2 < tol * tol) return s.id;
      } else if (s.kind === "rect") {
        const x = Number(s.x);
        const y = Number(s.y);
        const w = Number(s.w);
        const h = Number(s.h);
        if (s.fill && wx >= x && wx <= x + w && wy >= y && wy <= y + h) {
          return s.id;
        }
        // Outline hit (stroke only)
        const onTop = wy >= y - tol && wy <= y + tol && wx >= x - tol && wx <= x + w + tol;
        const onBottom =
          wy >= y + h - tol && wy <= y + h + tol && wx >= x - tol && wx <= x + w + tol;
        const onLeft = wx >= x - tol && wx <= x + tol && wy >= y - tol && wy <= y + h + tol;
        const onRight =
          wx >= x + w - tol && wx <= x + w + tol && wy >= y - tol && wy <= y + h + tol;
        if (onTop || onBottom || onLeft || onRight) return s.id;
      } else if (s.kind === "text") {
        const x = Number(s.x);
        const y = Number(s.y);
        const w = Number(s.w);
        const h = Number(s.h);
        if (wx >= x && wx <= x + w && wy >= y && wy <= y + h) return s.id;
      }
    }
    return null;
  }

  hitResizeHandle(shape: Shape, wx: number, wy: number): boolean {
    const z = this.viewport.zoom || 1;
    const tol = (HANDLE_PX + 4) / z;
    const x = Number(shape.x);
    const y = Number(shape.y);
    const w = shape.kind === "line" ? Math.abs(Number(shape.w)) : Number(shape.w);
    const h = shape.kind === "line" ? Math.abs(Number(shape.h)) : Number(shape.h);
    return Math.abs(wx - (x + w)) <= tol && Math.abs(wy - (y + h)) <= tol;
  }
}

function pointSegDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}
