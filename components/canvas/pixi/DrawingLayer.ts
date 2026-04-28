import * as PIXI from "pixi.js";
import type { ParsedEntity } from "@/stores/editorStore";

/**
 * Renders the source drawing (DXF/DWG entities, PDF texture, image) into the
 * world. For images we add a Sprite. For vector entities we use a single
 * Graphics instance — Pixi 8 batches strokes efficiently.
 */
export class DrawingLayer extends PIXI.Container {
  private gfx = new PIXI.Graphics();
  private sprites: PIXI.Sprite[] = [];

  constructor() {
    super();
    this.label = "drawing";
    this.eventMode = "none";
    this.addChild(this.gfx);
  }

  clear() {
    this.gfx.clear();
    for (const s of this.sprites) s.destroy({ children: true, texture: false });
    this.sprites = [];
  }

  render(entities: ParsedEntity[]) {
    this.clear();
    const g = this.gfx;
    for (const e of entities) {
      const color = e.kind === "text" ? (e as any).color ?? 0x1c1917 : (e as any).color ?? 0x1c1917;
      switch (e.kind) {
        case "line":
          g.moveTo(e.ax, e.ay);
          g.lineTo(e.bx, e.by);
          break;
        case "polyline": {
          const pts = e.points;
          if (pts.length < 4) break;
          g.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
          if (e.closed) g.lineTo(pts[0], pts[1]);
          break;
        }
        case "circle":
          g.circle(e.cx, e.cy, e.r);
          break;
        case "arc": {
          const start = e.start;
          const end = e.end;
          g.arc(e.cx, e.cy, e.r, start, end);
          break;
        }
        case "text": {
          // Text rendered as a simple Text object to keep things light.
          const txt = new PIXI.Text({
            text: e.text,
            style: { fontFamily: "Inter", fontSize: e.size, fill: color, fontWeight: "400" },
          });
          txt.position.set(e.x, e.y - e.size);
          this.addChild(txt);
          break;
        }
        case "image": {
          PIXI.Assets.load(e.src).then((tex: PIXI.Texture) => {
            const sp = new PIXI.Sprite(tex);
            sp.position.set(e.x, e.y);
            sp.width = e.w;
            sp.height = e.h;
            this.addChildAt(sp, 0);
            this.sprites.push(sp);
          });
          break;
        }
      }
    }
    g.stroke({ color: 0x1c1917, width: 1, pixelLine: true });
  }
}
