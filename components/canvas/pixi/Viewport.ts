import * as PIXI from "pixi.js";
import type { Bounds, Pt } from "@/lib/utils/geometry";

export class Viewport {
  readonly world: PIXI.Container;
  private hostW = 1;
  private hostH = 1;

  constructor(public readonly app: PIXI.Application) {
    this.world = new PIXI.Container();
    this.world.label = "world";
    app.stage.addChild(this.world);
  }

  setSize(w: number, h: number) {
    this.hostW = w;
    this.hostH = h;
  }

  get x() { return this.world.position.x; }
  get y() { return this.world.position.y; }
  get zoom() { return this.world.scale.x; }

  set position(p: Pt) {
    this.world.position.set(p.x, p.y);
  }

  set scale(s: number) {
    this.world.scale.set(s, s);
  }

  screenToWorld(sx: number, sy: number): Pt {
    const z = this.world.scale.x;
    return { x: (sx - this.world.position.x) / z, y: (sy - this.world.position.y) / z };
  }

  worldToScreen(wx: number, wy: number): Pt {
    const z = this.world.scale.x;
    return { x: wx * z + this.world.position.x, y: wy * z + this.world.position.y };
  }

  pan(dx: number, dy: number) {
    this.world.position.set(this.world.position.x + dx, this.world.position.y + dy);
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const before = this.screenToWorld(sx, sy);
    // Wide range — feels infinite. 100,000,000× difference between min and
    // max. The browser's float precision tops out before this matters.
    const newScale = clamp(this.zoom * factor, 0.0001, 10000);
    this.world.scale.set(newScale, newScale);
    const after = this.screenToWorld(sx, sy);
    this.world.position.set(
      this.world.position.x + (after.x - before.x) * newScale,
      this.world.position.y + (after.y - before.y) * newScale,
    );
  }

  fitTo(b: Bounds, padding = 60) {
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    if (w <= 0 || h <= 0) return;
    const sx = (this.hostW - padding * 2) / w;
    const sy = (this.hostH - padding * 2) / h;
    const s = Math.min(sx, sy);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    this.world.scale.set(s, s);
    this.world.position.set(this.hostW / 2 - cx * s, this.hostH / 2 - cy * s);
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
