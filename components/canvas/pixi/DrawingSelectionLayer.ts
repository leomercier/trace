import * as PIXI from "pixi.js";
import type { Viewport } from "./Viewport";
import type { Drawing } from "@/stores/editorStore";

const HANDLE_PX = 10;
const SELECTION_COLOR = 0x1c1917;
const ROTATE_HANDLE_OFFSET_PX = 24;

export type DrawingHandle = "resize" | "rotate";

/**
 * Draws the selection outline + resize / rotate handles around the
 * currently-selected drawing. Lives above DrawingLayer so the box doesn't
 * get covered by entity strokes.
 */
export class DrawingSelectionLayer extends PIXI.Container {
  private gfx = new PIXI.Graphics();

  constructor(private viewport: Viewport) {
    super();
    this.label = "drawing-selection";
    this.eventMode = "none";
    this.addChild(this.gfx);
  }

  render(d: Drawing | null) {
    this.gfx.clear();
    if (!d) return;
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;
    const cx = (d.bounds.minX + d.bounds.maxX) / 2 + (d.x || 0);
    const cy = (d.bounds.minY + d.bounds.maxY) / 2 + (d.y || 0);
    const w = (d.bounds.maxX - d.bounds.minX) * (d.scale || 1);
    const h = (d.bounds.maxY - d.bounds.minY) * (d.scale || 1);
    const rRad = ((d.rotation || 0) * Math.PI) / 180;

    // Move + rotate the local coord system to the drawing's centre.
    this.gfx.position.set(cx, cy);
    this.gfx.rotation = rRad;

    // Bounding box
    this.gfx
      .rect(-w / 2, -h / 2, w, h)
      .stroke({
        color: SELECTION_COLOR,
        width: px(1.5),
        pixelLine: false,
      });

    // Locked drawings show the box only — no handles.
    if (d.locked) {
      // Subtle "locked" indicator: draw a small lock dot at top-left.
      this.gfx
        .circle(-w / 2 + px(8), -h / 2 + px(8), px(3))
        .fill(SELECTION_COLOR);
      return;
    }

    // Resize handle (bottom-right)
    const hx = w / 2;
    const hy = h / 2;
    this.gfx
      .rect(hx - px(HANDLE_PX / 2), hy - px(HANDLE_PX / 2), px(HANDLE_PX), px(HANDLE_PX))
      .fill(0xffffff)
      .stroke({ color: SELECTION_COLOR, width: px(1.5) });

    // Rotate handle (above top edge)
    const ry = -h / 2 - px(ROTATE_HANDLE_OFFSET_PX);
    this.gfx
      .moveTo(0, -h / 2)
      .lineTo(0, ry)
      .stroke({ color: SELECTION_COLOR, width: px(1) });
    this.gfx
      .circle(0, ry, px(HANDLE_PX / 2))
      .fill(0xffffff)
      .stroke({ color: SELECTION_COLOR, width: px(1.5) });
  }

  /** Topmost drawing under (wx, wy), or null. Iterates by sortOrder desc. */
  hitTest(drawings: Drawing[], wx: number, wy: number): string | null {
    const ordered = [...drawings]
      .filter((d) => d.visible)
      .sort((a, b) => b.sortOrder - a.sortOrder);
    for (const d of ordered) {
      if (this.containsPoint(d, wx, wy)) return d.id;
    }
    return null;
  }

  /** Which handle (if any) is under (wx, wy) for the selected drawing. */
  hitHandle(d: Drawing, wx: number, wy: number): DrawingHandle | null {
    if (d.locked) return null;
    const z = this.viewport.zoom || 1;
    const local = this.worldToLocal(d, wx, wy);
    const w = (d.bounds.maxX - d.bounds.minX) * (d.scale || 1);
    const h = (d.bounds.maxY - d.bounds.minY) * (d.scale || 1);
    const tol = (HANDLE_PX + 4) / z;
    if (Math.abs(local.x - w / 2) <= tol && Math.abs(local.y - h / 2) <= tol)
      return "resize";
    const ry = -h / 2 - ROTATE_HANDLE_OFFSET_PX / z;
    if (Math.abs(local.x) <= tol && Math.abs(local.y - ry) <= tol) return "rotate";
    return null;
  }

  private containsPoint(d: Drawing, wx: number, wy: number): boolean {
    const local = this.worldToLocal(d, wx, wy);
    const w = (d.bounds.maxX - d.bounds.minX) * (d.scale || 1);
    const h = (d.bounds.maxY - d.bounds.minY) * (d.scale || 1);
    return Math.abs(local.x) <= w / 2 && Math.abs(local.y) <= h / 2;
  }

  private worldToLocal(d: Drawing, wx: number, wy: number) {
    const cx = (d.bounds.minX + d.bounds.maxX) / 2 + (d.x || 0);
    const cy = (d.bounds.minY + d.bounds.maxY) / 2 + (d.y || 0);
    const r = ((d.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(-r);
    const sin = Math.sin(-r);
    const dx = wx - cx;
    const dy = wy - cy;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  }
}
