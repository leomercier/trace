import type { ParsedEntity } from "@/stores/editorStore";

interface Cell {
  pts: { x: number; y: number }[];
}

/**
 * Cheap grid-hash spatial index over entity vertices. Good enough for
 * 50k vertices on a phone. Build once per page load.
 */
export class SnapIndex {
  private grid = new Map<string, Cell>();
  private cellSize: number;
  private vertices: { x: number; y: number }[] = [];

  constructor(cellSize = 100) {
    this.cellSize = cellSize;
  }

  build(entities: ParsedEntity[]) {
    this.grid.clear();
    this.vertices = [];
    const push = (x: number, y: number) => {
      this.vertices.push({ x, y });
      const k = this.key(x, y);
      let c = this.grid.get(k);
      if (!c) {
        c = { pts: [] };
        this.grid.set(k, c);
      }
      c.pts.push({ x, y });
    };
    for (const e of entities) {
      switch (e.kind) {
        case "line":
          push(e.ax, e.ay);
          push(e.bx, e.by);
          break;
        case "polyline":
          for (let i = 0; i < e.points.length; i += 2) push(e.points[i], e.points[i + 1]);
          break;
        case "circle":
          push(e.cx, e.cy);
          break;
        case "arc":
          push(e.cx, e.cy);
          break;
        case "text":
          push(e.x, e.y);
          break;
        case "image":
          push(e.x, e.y);
          push(e.x + e.w, e.y);
          push(e.x, e.y + e.h);
          push(e.x + e.w, e.y + e.h);
          break;
      }
    }
  }

  /** Find a vertex within `radius` (world units) of (x,y), or null. */
  nearest(x: number, y: number, radius: number): { x: number; y: number } | null {
    if (this.vertices.length === 0) return null;
    const r2 = radius * radius;
    const cs = Math.max(this.cellSize, radius);
    const gx0 = Math.floor((x - radius) / cs);
    const gy0 = Math.floor((y - radius) / cs);
    const gx1 = Math.floor((x + radius) / cs);
    const gy1 = Math.floor((y + radius) / cs);
    let best: { x: number; y: number } | null = null;
    let bestD = r2;
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const cell = this.grid.get(`${gx},${gy}`);
        if (!cell) continue;
        for (const p of cell.pts) {
          const dx = p.x - x;
          const dy = p.y - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
      }
    }
    return best;
  }

  private key(x: number, y: number) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
