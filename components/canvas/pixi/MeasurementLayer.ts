import * as PIXI from "pixi.js";
import type { Measurement } from "@/lib/supabase/types";
import type { Viewport } from "./Viewport";
import { formatLength } from "@/lib/utils/units";
import type { Unit } from "@/lib/utils/units";

const MEASURE = 0xdc2626;
const ENDPOINT_R_PX = 4;

interface LabelNode {
  container: PIXI.Container;
  text: PIXI.Text;
  bg: PIXI.Graphics;
  // Cached layout so we can skip the bg redraw when only position moved.
  cachedLabel: string;
  cachedW: number;
  cachedH: number;
}

/**
 * Measurement lines + endpoint dots + label in red. Endpoints and labels are
 * counter-scaled so they stay constant size as the user zooms. The leader
 * line that ties an offset label back to its midpoint is drawn into its own
 * Graphics so we can stroke it dotted without affecting the solid main line.
 *
 * Label nodes are reused across renders (id-keyed Map). Allocating fresh
 * `PIXI.Text` / `Graphics` per measurement per render generates GC pressure
 * during drag-pan and selection changes; mutating cached nodes is much
 * cheaper.
 */
export class MeasurementLayer extends PIXI.Container {
  private linesGfx = new PIXI.Graphics();
  private leadersGfx = new PIXI.Graphics();
  private dotsGfx = new PIXI.Graphics();
  private labelLayer = new PIXI.Container();
  private draftGfx = new PIXI.Graphics();
  private nodes = new Map<string, LabelNode>();

  constructor(private viewport: Viewport) {
    super();
    this.label = "measurements";
    this.eventMode = "none";
    this.addChild(this.linesGfx);
    this.addChild(this.leadersGfx);
    this.addChild(this.dotsGfx);
    this.addChild(this.labelLayer);
    this.addChild(this.draftGfx);
  }

  // Last-rendered label rectangles in world space, for hit-testing the
  // draggable label area.
  private labelRects: { id: string; x: number; y: number; w: number; h: number }[] = [];

  render(
    measurements: Measurement[],
    selectionId: string | null,
    scale: { realPerUnit: number; unit: Unit } | null,
  ) {
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;

    this.linesGfx.clear();
    this.leadersGfx.clear();
    this.dotsGfx.clear();
    this.labelRects = [];
    const seen = new Set<string>();

    for (const m of measurements) {
      seen.add(m.id);
      const ax = +m.ax,
        ay = +m.ay,
        bx = +m.bx,
        by = +m.by;
      // line
      this.linesGfx.moveTo(ax, ay);
      this.linesGfx.lineTo(bx, by);

      // endpoint dots
      this.dotsGfx
        .circle(ax, ay, px(ENDPOINT_R_PX))
        .circle(bx, by, px(ENDPOINT_R_PX));

      // label — show "Name · 1.20 m" when named, otherwise just the length
      const len = Math.hypot(bx - ax, by - ay);
      const lenStr = scale
        ? formatLength(len * scale.realPerUnit, scale.unit)
        : `${len.toFixed(2)} u`;
      const label = m.label ? `${m.label} · ${lenStr}` : lenStr;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const dx = Number(m.label_dx ?? 0);
      const dy = Number(m.label_dy ?? 0);
      const lx = mx + dx;
      const ly = my + dy;

      // Dotted leader from midpoint to offset label. Pixi v8 has no native
      // dash support, so we approximate with short stroked segments. The
      // segment length is in screen pixels (counter-scaled to world) so the
      // density stays consistent across zoom levels.
      const leaderLen = Math.hypot(dx, dy);
      if (leaderLen > 0.001) {
        const dashPx = 4;
        const gapPx = 3;
        const ux = dx / leaderLen;
        const uy = dy / leaderLen;
        let t = 0;
        while (t < leaderLen) {
          const t2 = Math.min(leaderLen, t + px(dashPx));
          this.leadersGfx
            .moveTo(mx + ux * t, my + uy * t)
            .lineTo(mx + ux * t2, my + uy * t2);
          t = t2 + px(gapPx);
        }
      }

      // Reuse the per-measurement label container so we're not allocating
      // a fresh PIXI.Text + Graphics + Container on every render.
      let node = this.nodes.get(m.id);
      if (!node) {
        const text = new PIXI.Text({
          text: label,
          style: {
            fontFamily: "JetBrains Mono",
            fontSize: 12,
            fill: 0xffffff,
            fontWeight: "500",
          },
        });
        text.anchor.set(0.5, 0.5);
        const bg = new PIXI.Graphics();
        const container = new PIXI.Container();
        container.addChild(bg);
        container.addChild(text);
        this.labelLayer.addChild(container);
        node = {
          container,
          text,
          bg,
          cachedLabel: "",
          cachedW: 0,
          cachedH: 0,
        };
        this.nodes.set(m.id, node);
      }
      if (node.cachedLabel !== label) {
        node.text.text = label;
        node.cachedLabel = label;
      }
      const padX = 6;
      const padY = 3;
      const w = node.text.width + padX * 2;
      const h = node.text.height + padY * 2;
      // Only redraw the background when the size actually changed (label
      // text changed or font metrics shifted). Position-only moves leave
      // the bg geometry intact.
      if (w !== node.cachedW || h !== node.cachedH) {
        node.bg.clear();
        node.bg.roundRect(-w / 2, -h / 2, w, h, 4).fill(MEASURE);
        node.cachedW = w;
        node.cachedH = h;
      }
      node.container.position.set(lx, ly);
      node.container.scale.set(1 / z, 1 / z);

      // Record the label's hit rect in WORLD units (counter-scaled to match
      // the rendered pill). Used by Canvas.tsx for label-drag.
      this.labelRects.push({
        id: m.id,
        x: lx - (w / 2) / z,
        y: ly - (h / 2) / z,
        w: w / z,
        h: h / z,
      });

      if (selectionId === m.id) {
        // emphasis ring
        this.dotsGfx
          .circle(ax, ay, px(ENDPOINT_R_PX + 4))
          .circle(bx, by, px(ENDPOINT_R_PX + 4));
      }
    }

    // Prune nodes whose measurement was removed.
    for (const [id, node] of this.nodes) {
      if (!seen.has(id)) {
        node.container.destroy({ children: true });
        this.nodes.delete(id);
      }
    }

    this.linesGfx.stroke({
      color: MEASURE,
      width: px(1.5),
      pixelLine: false,
    });
    this.leadersGfx.stroke({
      color: MEASURE,
      width: px(1),
      alpha: 0.7,
    });
    this.dotsGfx.fill(MEASURE);
  }

  /**
   * Returns the measurement id whose label rectangle contains the world point
   * (wx, wy), or null. Topmost (last-rendered) wins.
   */
  hitLabel(wx: number, wy: number): string | null {
    for (let i = this.labelRects.length - 1; i >= 0; i--) {
      const r = this.labelRects[i];
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
        return r.id;
      }
    }
    return null;
  }

  drawDraft(start: { x: number; y: number } | null, end: { x: number; y: number } | null) {
    this.draftGfx.clear();
    if (!start || !end) return;
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;
    this.draftGfx
      .moveTo(start.x, start.y)
      .lineTo(end.x, end.y)
      .stroke({ color: MEASURE, width: px(1.5) });
    this.draftGfx
      .circle(start.x, start.y, px(ENDPOINT_R_PX))
      .circle(end.x, end.y, px(ENDPOINT_R_PX))
      .fill(MEASURE);
  }
}
