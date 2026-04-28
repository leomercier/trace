import * as PIXI from "pixi.js";
import type { Measurement } from "@/lib/supabase/types";
import type { Viewport } from "./Viewport";
import { formatLength } from "@/lib/utils/units";
import type { Unit } from "@/lib/utils/units";

const MEASURE = 0xdc2626;
const ENDPOINT_R_PX = 4;
const TICK_PX = 8;

/**
 * Measurement lines + endpoint dots + label in red. Endpoints and labels are
 * counter-scaled so they stay constant size as the user zooms.
 */
export class MeasurementLayer extends PIXI.Container {
  private linesGfx = new PIXI.Graphics();
  private dotsGfx = new PIXI.Graphics();
  private labelLayer = new PIXI.Container();
  private draftGfx = new PIXI.Graphics();

  constructor(private viewport: Viewport) {
    super();
    this.label = "measurements";
    this.eventMode = "none";
    this.addChild(this.linesGfx);
    this.addChild(this.dotsGfx);
    this.addChild(this.labelLayer);
    this.addChild(this.draftGfx);
  }

  render(
    measurements: Measurement[],
    selectionId: string | null,
    scale: { realPerUnit: number; unit: Unit } | null,
  ) {
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;

    this.linesGfx.clear();
    this.dotsGfx.clear();
    this.labelLayer.removeChildren();

    for (const m of measurements) {
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

      // label
      const len = Math.hypot(bx - ax, by - ay);
      const label = m.label || (scale ? formatLength(len * scale.realPerUnit, scale.unit) : `${len.toFixed(2)} u`);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const txt = new PIXI.Text({
        text: label,
        style: {
          fontFamily: "JetBrains Mono",
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: "500",
        },
      });
      const padX = 6;
      const padY = 3;
      const w = txt.width + padX * 2;
      const h = txt.height + padY * 2;
      const bg = new PIXI.Graphics();
      bg.roundRect(-w / 2, -h / 2, w, h, 4).fill(MEASURE);
      const cont = new PIXI.Container();
      cont.addChild(bg);
      txt.anchor.set(0.5, 0.5);
      cont.addChild(txt);
      cont.position.set(mx, my);
      cont.scale.set(1 / z, 1 / z);
      this.labelLayer.addChild(cont);

      if (selectionId === m.id) {
        // emphasis ring
        this.dotsGfx
          .circle(ax, ay, px(ENDPOINT_R_PX + 4))
          .circle(bx, by, px(ENDPOINT_R_PX + 4));
      }
    }

    this.linesGfx.stroke({
      color: MEASURE,
      width: px(1.5),
      pixelLine: false,
    });
    this.dotsGfx.fill(MEASURE);
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
