import * as PIXI from "pixi.js";
import type { Viewport } from "./Viewport";
import type { RemoteCursor } from "@/stores/editorStore";

/**
 * Renders other users' cursors. Positions are stored in WORLD coords so
 * everyone sees the same point regardless of their zoom level. We
 * counter-scale the markers to stay constant size on screen.
 */
export class CursorLayer extends PIXI.Container {
  private nodes = new Map<string, PIXI.Container>();

  constructor(private viewport: Viewport) {
    super();
    this.label = "cursors";
    this.eventMode = "none";
  }

  render(cursors: RemoteCursor[]) {
    const z = this.viewport.zoom || 1;
    const seen = new Set<string>();
    for (const c of cursors) {
      seen.add(c.userId);
      let node = this.nodes.get(c.userId);
      if (!node) {
        node = buildCursor(c.color, c.name);
        this.nodes.set(c.userId, node);
        this.addChild(node);
      }
      node.position.set(c.x, c.y);
      node.scale.set(1 / z, 1 / z);
    }
    // remove stale
    for (const [id, node] of this.nodes) {
      if (!seen.has(id)) {
        node.destroy({ children: true });
        this.nodes.delete(id);
      }
    }
  }

  clear() {
    for (const node of this.nodes.values()) node.destroy({ children: true });
    this.nodes.clear();
  }
}

function buildCursor(color: string, name: string) {
  const c = new PIXI.Container();
  // arrow
  const arrow = new PIXI.Graphics();
  const col = parseColor(color);
  arrow
    .moveTo(0, 0)
    .lineTo(0, 18)
    .lineTo(5, 13)
    .lineTo(8, 20)
    .lineTo(11, 19)
    .lineTo(8, 12)
    .lineTo(15, 12)
    .closePath()
    .fill(col)
    .stroke({ color: 0xffffff, width: 1 });
  c.addChild(arrow);
  // name pill
  const txt = new PIXI.Text({
    text: name,
    style: { fontFamily: "Inter", fontSize: 11, fill: 0xffffff, fontWeight: "500" },
  });
  const padX = 5,
    padY = 2;
  const w = txt.width + padX * 2;
  const h = txt.height + padY * 2;
  const pill = new PIXI.Graphics().roundRect(0, 0, w, h, 3).fill(col);
  txt.position.set(padX, padY);
  const pillC = new PIXI.Container();
  pillC.addChild(pill, txt);
  pillC.position.set(14, 18);
  c.addChild(pillC);
  return c;
}

function parseColor(c: string): number {
  if (c.startsWith("#")) return parseInt(c.slice(1), 16);
  return 0xdc2626;
}
