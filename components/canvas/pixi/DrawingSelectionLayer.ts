import * as PIXI from "pixi.js";
import type { Drawing } from "@/stores/editorStore";
import type { Bounds } from "@/lib/utils/geometry";
import type { Viewport } from "./Viewport";
import { HANDLE_PX, HANDLE_WHITE, SELECTION_BLUE, SELECTION_LOCK } from "./selection";

const SELECTION_COLOR = SELECTION_BLUE;
const LOCK_COLOR = SELECTION_LOCK;

/**
 * Renders the selection chrome for the currently-selected drawing
 * (DXF/PDF/PNG/SVG/etc layer). Identical interaction model to
 * PlacedItemsLayer:
 *   - bbox outline,
 *   - resize handle at the bottom-right corner,
 *   - rotate handle 20px above the top edge.
 *
 * Locked drawings show a dimmed dashed outline and no handles, so the
 * user can still see the layer is selected but can't accidentally drag it.
 *
 * The Drawing's transform (tx, ty, scale, rotation) is applied to its
 * untransformed bounds at render time. Hit testing converts a world
 * point back into the drawing's local space and checks whether it lies
 * inside (or near) any of the bbox handles.
 */
export class DrawingSelectionLayer extends PIXI.Container {
  private gfx = new PIXI.Graphics();

  constructor(private viewport: Viewport) {
    super();
    this.label = "drawing-selection";
    this.eventMode = "passive";
    this.addChild(this.gfx);
  }

  render(drawing: Drawing | null) {
    this.gfx.clear();
    if (!drawing || !drawing.bounds) return;
    const z = this.viewport.zoom || 1;
    const px = (n: number) => n / z;

    const cx = (drawing.bounds.minX + drawing.bounds.maxX) / 2;
    const cy = (drawing.bounds.minY + drawing.bounds.maxY) / 2;
    const localW = drawing.bounds.maxX - drawing.bounds.minX;
    const localH = drawing.bounds.maxY - drawing.bounds.minY;
    const w = localW * (drawing.scale || 1);
    const h = localH * (drawing.scale || 1);

    // Centre-pivot model: the drawing's centre sits at (cx + tx, cy + ty)
    // in world space, then scale + rotation apply about that point.
    const wx = cx + drawing.tx;
    const wy = cy + drawing.ty;
    this.gfx.position.set(wx, wy);
    this.gfx.rotation = ((drawing.rotation || 0) * Math.PI) / 180;

    const stroke = drawing.locked ? LOCK_COLOR : SELECTION_COLOR;
    const dash = drawing.locked ? [4, 4] : null;

    // Bounding box (corners are at +/- w/2, h/2 in local coords).
    if (dash) {
      drawDashedRect(this.gfx, -w / 2, -h / 2, w, h, dash[0] / z, dash[1] / z);
      this.gfx.stroke({ color: stroke, width: px(1.5), alpha: 0.85 });
    } else {
      this.gfx
        .rect(-w / 2, -h / 2, w, h)
        .stroke({ color: stroke, width: px(1.5) });
    }

    if (drawing.locked) return;

    // Four corner resize handles. Drawings scale uniformly so any
    // corner produces the same effect — drawing them all reads as
    // "this is resizable" without surprising the user.
    const hx = w / 2;
    const hy = h / 2;
    const corners: [number, number][] = [
      [-hx, -hy],
      [hx, -hy],
      [-hx, hy],
      [hx, hy],
    ];
    for (const [cx, cy] of corners) {
      this.gfx
        .rect(cx - px(HANDLE_PX / 2), cy - px(HANDLE_PX / 2), px(HANDLE_PX), px(HANDLE_PX))
        .fill(HANDLE_WHITE)
        .stroke({ color: stroke, width: px(1.5) });
    }

    // Rotate handle (centred 20px above the top edge)
    const ry = -h / 2 - px(20);
    this.gfx.moveTo(0, -h / 2).lineTo(0, ry).stroke({ color: stroke, width: px(1) });
    this.gfx
      .circle(0, ry, px(HANDLE_PX / 2))
      .fill(HANDLE_WHITE)
      .stroke({ color: stroke, width: px(1.5) });
  }

  /** Returns the drawing id whose transformed bounds contain the world point, or null. */
  hitTest(drawings: Drawing[], wx: number, wy: number): string | null {
    // Iterate topmost first (highest sortOrder). Items added later in the
    // sorted array were drawn on top.
    const sorted = [...drawings]
      .filter((d) => d.visible && d.bounds)
      .sort((a, b) => b.sortOrder - a.sortOrder);
    for (const d of sorted) {
      if (pointInsideDrawing(d, wx, wy)) return d.id;
    }
    return null;
  }

  /**
   * Is the world point on a handle of the selected drawing? Returns
   * "resize" / "rotate" / null. Locked drawings return null
   * unconditionally.
   */
  hitHandle(d: Drawing, wx: number, wy: number): "resize" | "rotate" | null {
    if (d.locked) return null;
    const local = worldToLocal(d, wx, wy);
    const z = this.viewport.zoom || 1;
    const tol = (HANDLE_PX + 4) / z;
    const localW = d.bounds.maxX - d.bounds.minX;
    const localH = d.bounds.maxY - d.bounds.minY;
    const w = localW * (d.scale || 1);
    const h = localH * (d.scale || 1);
    const hx = w / 2;
    const hy = h / 2;
    if (
      (Math.abs(local.x - hx) <= tol && Math.abs(local.y - hy) <= tol) ||
      (Math.abs(local.x + hx) <= tol && Math.abs(local.y - hy) <= tol) ||
      (Math.abs(local.x - hx) <= tol && Math.abs(local.y + hy) <= tol) ||
      (Math.abs(local.x + hx) <= tol && Math.abs(local.y + hy) <= tol)
    ) {
      return "resize";
    }
    const ry = -h / 2 - 20 / z;
    if (Math.abs(local.x) <= tol && Math.abs(local.y - ry) <= tol) {
      return "rotate";
    }
    return null;
  }
}

function pointInsideDrawing(d: Drawing, wx: number, wy: number): boolean {
  const local = worldToLocal(d, wx, wy);
  const localW = d.bounds.maxX - d.bounds.minX;
  const localH = d.bounds.maxY - d.bounds.minY;
  const w = localW * (d.scale || 1);
  const h = localH * (d.scale || 1);
  return Math.abs(local.x) <= w / 2 && Math.abs(local.y) <= h / 2;
}

function worldToLocal(d: Drawing, wx: number, wy: number): { x: number; y: number } {
  const cx = (d.bounds.minX + d.bounds.maxX) / 2;
  const cy = (d.bounds.minY + d.bounds.maxY) / 2;
  const ox = cx + d.tx;
  const oy = cy + d.ty;
  const dx = wx - ox;
  const dy = wy - oy;
  const r = ((d.rotation || 0) * Math.PI) / 180;
  return {
    x: dx * Math.cos(-r) - dy * Math.sin(-r),
    y: dx * Math.sin(-r) + dy * Math.cos(-r),
  };
}

function drawDashedRect(
  g: PIXI.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  dash: number,
  gap: number,
) {
  const stride = dash + gap;
  // Top
  for (let cx = 0; cx < w; cx += stride) {
    const end = Math.min(cx + dash, w);
    g.moveTo(x + cx, y).lineTo(x + end, y);
  }
  // Bottom
  for (let cx = 0; cx < w; cx += stride) {
    const end = Math.min(cx + dash, w);
    g.moveTo(x + cx, y + h).lineTo(x + end, y + h);
  }
  // Left
  for (let cy = 0; cy < h; cy += stride) {
    const end = Math.min(cy + dash, h);
    g.moveTo(x, y + cy).lineTo(x, y + end);
  }
  // Right
  for (let cy = 0; cy < h; cy += stride) {
    const end = Math.min(cy + dash, h);
    g.moveTo(x + w, y + cy).lineTo(x + w, y + end);
  }
}

export type DrawingTransform = {
  tx: number;
  ty: number;
  scale: number;
  rotation: number;
};

/**
 * Helpers to compute the new transform during a drag. Pulled out of the
 * Canvas event handler so the math is testable in isolation.
 */
export const drawingTransform = {
  /** Move: drag delta in world space → updated tx/ty. */
  move(start: DrawingTransform, dx: number, dy: number): Partial<DrawingTransform> {
    return { tx: start.tx + dx, ty: start.ty + dy };
  },

  /**
   * Resize: drag any corner handle. Drawings scale uniformly about
   * their centre, so the only thing that matters is how far the
   * pointer is from the centre — the corner sign doesn't change the
   * answer. We pick whichever axis the user has stretched most so
   * the corner under their cursor follows them.
   */
  resize(
    start: DrawingTransform,
    bounds: Bounds,
    localPointX: number,
    localPointY: number,
  ): Partial<DrawingTransform> {
    const localW = bounds.maxX - bounds.minX;
    const localH = bounds.maxY - bounds.minY;
    if (localW < 1e-6 || localH < 1e-6) return {};
    // Untransformed half-extents are localW/2 + localH/2; the
    // pointer's |distance| from centre divided by the half-extent
    // gives the new scale needed to put a corner under the pointer.
    const sx = (Math.abs(localPointX) * 2) / localW;
    const sy = (Math.abs(localPointY) * 2) / localH;
    const next = Math.max(0.05, Math.max(sx, sy));
    return { scale: next };
  },

  /**
   * Rotate handle: angle from drawing centre to the world pointer.
   * Top of bbox is -PI/2 in local space, so we offset the angle so a
   * pointer directly above the centre means rotation = 0°.
   */
  rotate(centre: { x: number; y: number }, wx: number, wy: number): Partial<DrawingTransform> {
    const angle = Math.atan2(wy - centre.y, wx - centre.x);
    const degrees = ((angle + Math.PI / 2) * 180) / Math.PI;
    return { rotation: degrees };
  },
};
