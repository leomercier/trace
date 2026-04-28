export interface Pt {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function dist(a: Pt, b: Pt) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function angle(a: Pt, b: Pt) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function emptyBounds(): Bounds {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function expandBounds(b: Bounds, p: Pt) {
  if (p.x < b.minX) b.minX = p.x;
  if (p.y < b.minY) b.minY = p.y;
  if (p.x > b.maxX) b.maxX = p.x;
  if (p.y > b.maxY) b.maxY = p.y;
}

export function boundsCenter(b: Bounds): Pt {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function boundsSize(b: Bounds) {
  return { w: b.maxX - b.minX, h: b.maxY - b.minY };
}
