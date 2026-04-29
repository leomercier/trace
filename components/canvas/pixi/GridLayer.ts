import * as PIXI from "pixi.js";
import type { Viewport } from "./Viewport";

/**
 * Renders an "infinite" grid by drawing every line that intersects the
 * current visible viewport. Cell size is supplied in WORLD units (typically
 * derived from real-mm via the page's calibration). Re-rendered on
 * pan/zoom; cheap because we only draw what's on screen.
 */
export class GridLayer extends PIXI.Container {
  private gfx = new PIXI.Graphics();
  private hostW = 1;
  private hostH = 1;

  constructor(private viewport: Viewport) {
    super();
    this.label = "grid";
    this.eventMode = "none";
    this.addChild(this.gfx);
  }

  setSize(w: number, h: number) {
    this.hostW = w;
    this.hostH = h;
  }

  render(cellSizeWorld: number) {
    this.gfx.clear();
    if (!this.visible || cellSizeWorld <= 0) return;

    // Bail if cell would be < 4px on screen — too dense to be useful and
    // would hammer the GPU.
    const z = this.viewport.zoom || 1;
    const cellPx = cellSizeWorld * z;
    if (cellPx < 4) return;

    // World bounds of the current viewport
    const tl = this.viewport.screenToWorld(0, 0);
    const br = this.viewport.screenToWorld(this.hostW, this.hostH);
    const minX = Math.floor(tl.x / cellSizeWorld) * cellSizeWorld;
    const maxX = Math.ceil(br.x / cellSizeWorld) * cellSizeWorld;
    const minY = Math.floor(tl.y / cellSizeWorld) * cellSizeWorld;
    const maxY = Math.ceil(br.y / cellSizeWorld) * cellSizeWorld;

    const minorColor = 0xe7e5e4;
    const majorColor = 0xd6d3d1;
    const px = (n: number) => n / z;

    for (let x = minX; x <= maxX + 0.001; x += cellSizeWorld) {
      const isMajor = Math.round(x / cellSizeWorld) % 5 === 0;
      this.gfx.moveTo(x, minY).lineTo(x, maxY).stroke({
        color: isMajor ? majorColor : minorColor,
        width: px(isMajor ? 1 : 0.5),
        pixelLine: true,
      });
    }
    for (let y = minY; y <= maxY + 0.001; y += cellSizeWorld) {
      const isMajor = Math.round(y / cellSizeWorld) % 5 === 0;
      this.gfx.moveTo(minX, y).lineTo(maxX, y).stroke({
        color: isMajor ? majorColor : minorColor,
        width: px(isMajor ? 1 : 0.5),
        pixelLine: true,
      });
    }
  }
}
