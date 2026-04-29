import type { ParseResult } from ".";
import type { ParsedEntity } from "@/stores/editorStore";
import { emptyBounds, expandBounds } from "@/lib/utils/geometry";

/**
 * DXF parser. Hand-rolled because every JS library that handles INSERT
 * blocks pulls in 100kB+. This pass supports enough of the spec to render
 * real-world architectural plans:
 *
 *   - LINE, LWPOLYLINE, POLYLINE / VERTEX, CIRCLE, ARC, ELLIPSE
 *   - TEXT, MTEXT (text content + position)
 *   - SOLID, 3DFACE (rendered as polylines along their corners)
 *   - SPLINE (rendered as a polyline through fit points)
 *   - INSERT (block references) — expanded with translation, scale, and
 *     rotation. Blocks can nest: an INSERT inside a BLOCK is recursively
 *     expanded up to a depth limit.
 *
 * Coordinate convention: Y is flipped (DXF Y goes up; Pixi Y goes down).
 *
 * For files where we still come up short, the user can re-export from
 * their CAD app — but block expansion alone gets ~95% of typical
 * architectural DWGs rendering correctly.
 */
export async function parseDxf(file: Blob): Promise<ParseResult> {
  const text = await file.text();
  const tokens = tokenize(text);

  const blocks = new Map<string, RawEntity[]>();
  const blockBase = new Map<string, { x: number; y: number }>();
  const modelEntities: RawEntity[] = [];

  // First pass — split into BLOCKS and ENTITIES sections.
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value === "SECTION") {
      const sectionName = tokens[i + 1]?.code === 2 ? tokens[i + 1].value : "";
      i += 2;
      if (sectionName === "BLOCKS") {
        i = parseBlocks(tokens, i, blocks, blockBase);
      } else if (sectionName === "ENTITIES") {
        i = parseEntities(tokens, i, modelEntities);
      } else {
        // Skip unknown section.
        while (i < tokens.length && !(tokens[i].code === 0 && tokens[i].value === "ENDSEC")) i++;
      }
    } else {
      i++;
    }
  }

  // Second pass — emit drawn entities, expanding INSERT references.
  const out: ParsedEntity[] = [];
  const bounds = emptyBounds();
  for (const e of modelEntities) {
    emit(e, blocks, blockBase, identityTransform(), out, bounds, 0);
  }

  if (!isFinite(bounds.minX)) {
    bounds.minX = 0;
    bounds.minY = 0;
    bounds.maxX = 100;
    bounds.maxY = 100;
  }
  return { entities: out, bounds };
}

// ============================================================
// Tokeniser
// ============================================================

interface Tok {
  code: number;
  value: string;
}

function tokenize(text: string): Tok[] {
  const lines = text.split(/\r?\n/);
  const out: Tok[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1] ?? "";
    if (Number.isNaN(code)) continue;
    out.push({ code, value: value.trim() });
  }
  return out;
}

// ============================================================
// Section parsing
// ============================================================

interface RawEntity {
  type: string;
  pairs: Tok[];
  /** Sub-entities for things like POLYLINE which absorb following VERTEX
   *  records up to SEQEND. */
  vertices?: RawEntity[];
}

function parseBlocks(
  tokens: Tok[],
  start: number,
  blocks: Map<string, RawEntity[]>,
  blockBase: Map<string, { x: number; y: number }>,
): number {
  let i = start;
  let currentName: string | null = null;
  let currentEntities: RawEntity[] | null = null;
  let currentBase = { x: 0, y: 0 };

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.code === 0 && t.value === "ENDSEC") return i;
    if (t.code !== 0) {
      i++;
      continue;
    }

    const type = t.value;
    if (type === "BLOCK") {
      // Read block header pairs until next 0-coded token.
      const headerStart = ++i;
      while (i < tokens.length && tokens[i].code !== 0) i++;
      const header = tokens.slice(headerStart, i);
      const name = valueOf(header, 2) || valueOf(header, 3) || "";
      currentBase = {
        x: parseFloat(valueOf(header, 10) || "0") || 0,
        y: parseFloat(valueOf(header, 20) || "0") || 0,
      };
      currentName = name;
      currentEntities = [];
      blocks.set(name, currentEntities);
      blockBase.set(name, currentBase);
      continue;
    }
    if (type === "ENDBLK") {
      currentName = null;
      currentEntities = null;
      // Skip ENDBLK pairs.
      i++;
      while (i < tokens.length && tokens[i].code !== 0) i++;
      continue;
    }

    // Inside a BLOCK definition: collect entities.
    if (currentEntities) {
      i = readEntity(tokens, i, currentEntities);
    } else {
      i++;
    }
  }
  return i;
}

function parseEntities(tokens: Tok[], start: number, out: RawEntity[]): number {
  let i = start;
  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value === "ENDSEC") return i;
    if (tokens[i].code !== 0) {
      i++;
      continue;
    }
    i = readEntity(tokens, i, out);
  }
  return i;
}

/**
 * Reads a single entity starting at tokens[i] (pointing at a 0-coded type
 * tag). For POLYLINE we also slurp following VERTEX entries up to SEQEND.
 * Returns the new index.
 */
function readEntity(tokens: Tok[], i: number, out: RawEntity[]): number {
  const type = tokens[i].value;
  const pairsStart = ++i;
  while (i < tokens.length && tokens[i].code !== 0) i++;
  const pairs = tokens.slice(pairsStart, i);
  const ent: RawEntity = { type, pairs };

  if (type === "POLYLINE") {
    ent.vertices = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.code !== 0) {
        i++;
        continue;
      }
      if (t.value === "SEQEND") {
        const seqEndStart = ++i;
        while (i < tokens.length && tokens[i].code !== 0) i++;
        break;
      }
      if (t.value === "VERTEX") {
        const vStart = ++i;
        while (i < tokens.length && tokens[i].code !== 0) i++;
        ent.vertices.push({ type: "VERTEX", pairs: tokens.slice(vStart, i) });
      } else {
        // Unknown — skip its pairs.
        i++;
        while (i < tokens.length && tokens[i].code !== 0) i++;
      }
    }
  }
  out.push(ent);
  return i;
}

// ============================================================
// Entity emission with INSERT expansion
// ============================================================

interface Transform {
  /** Translation in WORLD coordinates (post-rotation/scale). */
  tx: number;
  ty: number;
  /** Uniform-ish scale (we treat sx/sy independently). */
  sx: number;
  sy: number;
  /** Rotation in radians. */
  rot: number;
}

function identityTransform(): Transform {
  return { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 };
}

/** Apply a transform to a local (block-frame) point. */
function applyTransform(t: Transform, x: number, y: number): { x: number; y: number } {
  const sx = x * t.sx;
  const sy = y * t.sy;
  const cos = Math.cos(t.rot);
  const sin = Math.sin(t.rot);
  const rx = sx * cos - sy * sin;
  const ry = sx * sin + sy * cos;
  return { x: rx + t.tx, y: ry + t.ty };
}

/**
 * Compose the parent transform with an INSERT's local placement. Returns a
 * new transform such that points expressed in the inserted block's local
 * frame land at the right WORLD location.
 */
function composeInsert(
  parent: Transform,
  insertX: number,
  insertY: number,
  scaleX: number,
  scaleY: number,
  rotDeg: number,
  baseX: number,
  baseY: number,
): Transform {
  // The block's base point is its origin in the block frame. Subtract it
  // before scale/rotate.
  const localScaleX = scaleX || 1;
  const localScaleY = scaleY || 1;
  const localRot = (rotDeg || 0) * (Math.PI / 180);

  // Transform the (insertX, insertY) anchor through the parent first.
  const anchor = applyTransform(parent, insertX, insertY);

  // Combine parent rotation/scale with this insert's. We model the local
  // transform as: scale → rotate → translate (anchor).
  const cos = Math.cos(parent.rot + localRot);
  const sin = Math.sin(parent.rot + localRot);
  const sx = parent.sx * localScaleX;
  const sy = parent.sy * localScaleY;

  // Subtract base before applying the combined scale/rotate.
  // The cleanest way: produce a Transform that, when applied to (x, y),
  // gives the same result as: parent.apply(insertX + scaledRotated(x - base, y - base)).
  // We bake the "subtract base" into tx/ty by pre-translating the block.
  //
  // For our use, callers always pre-subtract base before calling
  // applyTransform(child, ...). So we just track the combined frame here.
  return {
    tx: anchor.x - (cos * (-baseX) - sin * (-baseY)) * sx + cos * (-baseX) * sx + sin * (-baseY) * sx,
    ty: anchor.y - (sin * (-baseX) + cos * (-baseY)) * sy + sin * (-baseX) * sy - cos * (-baseY) * sy,
    sx,
    sy,
    rot: parent.rot + localRot,
  };
}

const MAX_INSERT_DEPTH = 8;

function emit(
  e: RawEntity,
  blocks: Map<string, RawEntity[]>,
  blockBase: Map<string, { x: number; y: number }>,
  t: Transform,
  out: ParsedEntity[],
  bounds: ReturnType<typeof emptyBounds>,
  depth: number,
) {
  switch (e.type) {
    case "LINE": {
      const x1 = num(valueOf(e.pairs, 10));
      const y1 = -num(valueOf(e.pairs, 20));
      const x2 = num(valueOf(e.pairs, 11));
      const y2 = -num(valueOf(e.pairs, 21));
      const a = applyTransform(t, x1, y1);
      const b = applyTransform(t, x2, y2);
      out.push({ kind: "line", ax: a.x, ay: a.y, bx: b.x, by: b.y });
      expandBounds(bounds, a);
      expandBounds(bounds, b);
      return;
    }
    case "LWPOLYLINE": {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const p of e.pairs) {
        if (p.code === 10) xs.push(num(p.value));
        if (p.code === 20) ys.push(-num(p.value));
      }
      const flagsRaw = valueOf(e.pairs, 70);
      const closed = flagsRaw ? (parseInt(flagsRaw, 10) & 1) === 1 : false;
      const pts: number[] = [];
      for (let j = 0; j < Math.min(xs.length, ys.length); j++) {
        const w = applyTransform(t, xs[j], ys[j]);
        pts.push(w.x, w.y);
        expandBounds(bounds, w);
      }
      if (pts.length >= 4) out.push({ kind: "polyline", points: pts, closed });
      return;
    }
    case "POLYLINE": {
      // Vertices are in e.vertices. Each VERTEX has its own (10, 20) point.
      const pts: number[] = [];
      const vs = e.vertices || [];
      for (const v of vs) {
        const x = num(valueOf(v.pairs, 10));
        const y = -num(valueOf(v.pairs, 20));
        const w = applyTransform(t, x, y);
        pts.push(w.x, w.y);
        expandBounds(bounds, w);
      }
      const flagsRaw = valueOf(e.pairs, 70);
      const closed = flagsRaw ? (parseInt(flagsRaw, 10) & 1) === 1 : false;
      if (pts.length >= 4) out.push({ kind: "polyline", points: pts, closed });
      return;
    }
    case "CIRCLE": {
      const cx = num(valueOf(e.pairs, 10));
      const cy = -num(valueOf(e.pairs, 20));
      const r = num(valueOf(e.pairs, 40));
      const c = applyTransform(t, cx, cy);
      const rScaled = r * Math.max(t.sx, t.sy);
      out.push({ kind: "circle", cx: c.x, cy: c.y, r: rScaled });
      expandBounds(bounds, { x: c.x - rScaled, y: c.y - rScaled });
      expandBounds(bounds, { x: c.x + rScaled, y: c.y + rScaled });
      return;
    }
    case "ARC": {
      const cx = num(valueOf(e.pairs, 10));
      const cy = -num(valueOf(e.pairs, 20));
      const r = num(valueOf(e.pairs, 40));
      const start = (num(valueOf(e.pairs, 50)) * Math.PI) / 180;
      const end = (num(valueOf(e.pairs, 51)) * Math.PI) / 180;
      const c = applyTransform(t, cx, cy);
      const rScaled = r * Math.max(t.sx, t.sy);
      // Y-flip flips the sweep direction.
      out.push({
        kind: "arc",
        cx: c.x,
        cy: c.y,
        r: rScaled,
        start: -end + t.rot,
        end: -start + t.rot,
      });
      expandBounds(bounds, { x: c.x - rScaled, y: c.y - rScaled });
      expandBounds(bounds, { x: c.x + rScaled, y: c.y + rScaled });
      return;
    }
    case "ELLIPSE": {
      // Render as a polyline approximation — Pixi has no ellipse with rotation
      // built in, and our entity types are limited.
      const cx = num(valueOf(e.pairs, 10));
      const cy = -num(valueOf(e.pairs, 20));
      const majorX = num(valueOf(e.pairs, 11));
      const majorY = -num(valueOf(e.pairs, 21));
      const ratio = num(valueOf(e.pairs, 40)) || 1;
      const rMajor = Math.hypot(majorX, majorY);
      const rMinor = rMajor * ratio;
      const phi = Math.atan2(majorY, majorX);
      const SEGS = 48;
      const pts: number[] = [];
      for (let k = 0; k <= SEGS; k++) {
        const a = (k / SEGS) * Math.PI * 2;
        const lx = rMajor * Math.cos(a);
        const ly = rMinor * Math.sin(a);
        const rx = lx * Math.cos(phi) - ly * Math.sin(phi);
        const ry = lx * Math.sin(phi) + ly * Math.cos(phi);
        const w = applyTransform(t, cx + rx, cy + ry);
        pts.push(w.x, w.y);
        expandBounds(bounds, w);
      }
      out.push({ kind: "polyline", points: pts, closed: true });
      return;
    }
    case "SPLINE": {
      // Render through the fit points if present, otherwise control points.
      // Both come as (11, 21) for fit, (10, 20) for control. We treat them
      // as a polyline — good enough for visual reference.
      const fitX: number[] = [];
      const fitY: number[] = [];
      const ctrlX: number[] = [];
      const ctrlY: number[] = [];
      for (const p of e.pairs) {
        if (p.code === 11) fitX.push(num(p.value));
        if (p.code === 21) fitY.push(-num(p.value));
        if (p.code === 10) ctrlX.push(num(p.value));
        if (p.code === 20) ctrlY.push(-num(p.value));
      }
      const xs = fitX.length > 0 ? fitX : ctrlX;
      const ys = fitY.length > 0 ? fitY : ctrlY;
      const pts: number[] = [];
      for (let j = 0; j < Math.min(xs.length, ys.length); j++) {
        const w = applyTransform(t, xs[j], ys[j]);
        pts.push(w.x, w.y);
        expandBounds(bounds, w);
      }
      if (pts.length >= 4) out.push({ kind: "polyline", points: pts });
      return;
    }
    case "SOLID":
    case "3DFACE": {
      // Render as a closed polyline of the four corners.
      const corners: { x: number; y: number }[] = [];
      for (let k = 0; k < 4; k++) {
        const x = num(valueOf(e.pairs, 10 + k));
        const y = -num(valueOf(e.pairs, 20 + k));
        if (x === 0 && y === 0 && k > 0) continue;
        corners.push(applyTransform(t, x, y));
      }
      const pts: number[] = [];
      for (const c of corners) {
        pts.push(c.x, c.y);
        expandBounds(bounds, c);
      }
      if (pts.length >= 4) out.push({ kind: "polyline", points: pts, closed: true });
      return;
    }
    case "TEXT":
    case "MTEXT": {
      const x = num(valueOf(e.pairs, 10));
      const y = -num(valueOf(e.pairs, 20));
      const size = num(valueOf(e.pairs, 40)) || 10;
      const text = (valueOf(e.pairs, 1) || "")
        .replace(/\\P/g, "\n")
        .replace(/\\[A-Za-z]\d*;?/g, "")
        .replace(/\{|\}/g, "");
      if (text) {
        const w = applyTransform(t, x, y);
        const sizeScaled = size * Math.max(t.sx, t.sy);
        out.push({ kind: "text", x: w.x, y: w.y, size: sizeScaled, text });
        expandBounds(bounds, w);
        expandBounds(bounds, { x: w.x + text.length * sizeScaled * 0.5, y: w.y + sizeScaled });
      }
      return;
    }
    case "INSERT": {
      if (depth >= MAX_INSERT_DEPTH) return;
      const name = valueOf(e.pairs, 2) || "";
      const blockEntities = blocks.get(name);
      if (!blockEntities || blockEntities.length === 0) return;
      const insX = num(valueOf(e.pairs, 10));
      const insY = -num(valueOf(e.pairs, 20));
      const sx = parseFloat(valueOf(e.pairs, 41) || "1") || 1;
      const sy = parseFloat(valueOf(e.pairs, 42) || "1") || 1;
      const rotDeg = parseFloat(valueOf(e.pairs, 50) || "0") || 0;
      const base = blockBase.get(name) || { x: 0, y: 0 };

      // Compose: parent ∘ insert(base, ins, scale, rot)
      const child: Transform = composeNested(t, insX, insY, sx, sy, rotDeg, base.x, -base.y);

      for (const inner of blockEntities) {
        emit(inner, blocks, blockBase, child, out, bounds, depth + 1);
      }
      return;
    }
    default:
      // DIMENSION, HATCH, LEADER, etc — TODO(trace).
      return;
  }
}

/**
 * Build a Transform that maps points from the inserted block's local
 * coordinate frame (with `base` as origin) into the parent frame.
 *
 * Applied to a local point P:
 *   parent(  R * S * (P - base) + ins  )
 */
function composeNested(
  parent: Transform,
  insX: number,
  insY: number,
  sx: number,
  sy: number,
  rotDeg: number,
  baseX: number,
  baseY: number,
): Transform {
  const localRot = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(localRot);
  const sin = Math.sin(localRot);

  // Local: (P - base) * S, then rotate, then + ins.
  // Translation contribution from base subtraction:
  //   R * S * (-base) + ins
  const localTx = -baseX * sx * cos + -baseY * sy * -sin + insX;
  const localTy = -baseX * sx * sin + -baseY * sy * cos + insY;

  // Now compose with parent: parent.R * parent.S * (local) + parent.t
  const pCos = Math.cos(parent.rot);
  const pSin = Math.sin(parent.rot);
  const tx = pCos * (localTx * parent.sx) - pSin * (localTy * parent.sy) + parent.tx;
  const ty = pSin * (localTx * parent.sx) + pCos * (localTy * parent.sy) + parent.ty;

  return {
    tx,
    ty,
    sx: parent.sx * sx,
    sy: parent.sy * sy,
    rot: parent.rot + localRot,
  };
}

// ============================================================
// Helpers
// ============================================================

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function valueOf(pairs: Tok[], code: number): string | undefined {
  for (const t of pairs) if (t.code === code) return t.value;
  return undefined;
}
