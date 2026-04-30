import * as PIXI from "pixi.js";
import type { Frame } from "@/lib/supabase/types";
import type { Viewport } from "./Viewport";
import { HANDLE_PX, HANDLE_WHITE, SELECTION_BLUE } from "./selection";

const BORDER = 0x9ca3af;
const NAME_COLOR = 0x6b7280;

function hexToNum(hex: string | null | undefined, fallback = 0xffffff): number {
  if (!hex) return fallback;
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Renders frame rectangles (the "canvas" element). A frame is just a named,
 * bounded background — content sits inside spatially. The frame is drawn
 * BEHIND drawings/items/shapes (the layer mounts first in Canvas.tsx) so
 * it acts as a backdrop for whatever is placed on top.
 *
 * Selection chrome (corner handles) and the name label are drawn into
 * separate child Graphics so the chrome can sit on top of everything else
 * without dimming the frame itself.
 */
export class FramesLayer extends PIXI.Container {
  private bgGfx = new PIXI.Graphics();
  private borderGfx = new PIXI.Graphics();
  private chromeGfx = new PIXI.Graphics();
  private texts = new Map<string, PIXI.Text>();

  /** Last-rendered hit rectangles so Canvas.tsx can pick frames. */
  hits: { id: string; x: number; y: number; w: number; h: number }[] = [];
  /** Last-rendered handle hit boxes for resize. Keyed by frame id + corner. */
  handles: {
    id: string;
    corner: "tl" | "tr" | "bl" | "br";
    x: number;
    y: number;
    w: number;
    h: number;
  }[] = [];

  constructor(private viewport: Viewport) {
    super();
    this.label = "frames";
    this.eventMode = "passive";
    this.addChild(this.bgGfx);
    this.addChild(this.borderGfx);
    this.addChild(this.chromeGfx);
  }

  render(frames: Frame[], selectionId: string | null) {
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;

    this.bgGfx.clear();
    this.borderGfx.clear();
    this.chromeGfx.clear();
    this.hits = [];
    this.handles = [];

    const sorted = [...frames].sort(
      (a, b) =>
        Number(a.z_order ?? 0) - Number(b.z_order ?? 0) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const seen = new Set<string>();
    for (const f of sorted) {
      seen.add(f.id);
      const x = Number(f.x);
      const y = Number(f.y);
      const w = Number(f.w);
      const h = Number(f.h);
      const bg = hexToNum(f.background, 0xffffff);

      // Background fill — slightly darker outline so the frame is visible
      // against the canvas backdrop.
      this.bgGfx.rect(x, y, w, h).fill({ color: bg, alpha: 1 });

      // Always-on subtle border so empty frames stay discoverable.
      this.borderGfx
        .rect(x, y, w, h)
        .stroke({ color: BORDER, width: px(1), alpha: 0.6 });

      this.hits.push({ id: f.id, x, y, w, h });

      // Frame name label, top-left, counter-scaled.
      const nameNode = this.getOrCreateText(f);
      nameNode.text = f.name || "Canvas";
      nameNode.position.set(x, y - px(18));
      nameNode.scale.set(1 / z, 1 / z);
      nameNode.style.fill = selectionId === f.id ? SELECTION_BLUE : NAME_COLOR;

      if (selectionId === f.id) {
        // Selection outline + corner handles.
        this.chromeGfx
          .rect(x, y, w, h)
          .stroke({ color: SELECTION_BLUE, width: px(1.5), alpha: 1 });
        const hp = px(HANDLE_PX);
        const half = hp / 2;
        const corners: Array<{ corner: "tl" | "tr" | "bl" | "br"; x: number; y: number }> = [
          { corner: "tl", x: x, y: y },
          { corner: "tr", x: x + w, y: y },
          { corner: "bl", x: x, y: y + h },
          { corner: "br", x: x + w, y: y + h },
        ];
        for (const c of corners) {
          this.chromeGfx
            .rect(c.x - half, c.y - half, hp, hp)
            .fill(HANDLE_WHITE)
            .stroke({ color: SELECTION_BLUE, width: px(1) });
          this.handles.push({
            id: f.id,
            corner: c.corner,
            x: c.x - half,
            y: c.y - half,
            w: hp,
            h: hp,
          });
        }
      }
    }

    // Remove stale text nodes.
    for (const [id, node] of this.texts) {
      if (!seen.has(id)) {
        node.destroy({ children: true });
        this.texts.delete(id);
      }
    }
  }

  /** Topmost frame whose body contains the world point, or null. */
  hitFrame(wx: number, wy: number): string | null {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const r = this.hits[i];
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
        return r.id;
      }
    }
    return null;
  }

  /** Hit-test a resize handle on the currently-selected frame. */
  hitHandle(
    wx: number,
    wy: number,
  ): { id: string; corner: "tl" | "tr" | "bl" | "br" } | null {
    for (let i = this.handles.length - 1; i >= 0; i--) {
      const r = this.handles[i];
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
        return { id: r.id, corner: r.corner };
      }
    }
    return null;
  }

  private getOrCreateText(f: Frame): PIXI.Text {
    let node = this.texts.get(f.id);
    if (!node) {
      node = new PIXI.Text({
        text: f.name || "Canvas",
        style: {
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 12,
          fill: NAME_COLOR,
          fontWeight: "500",
        },
      });
      this.texts.set(f.id, node);
      this.addChild(node);
    }
    return node;
  }
}
