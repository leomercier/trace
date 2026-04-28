import type { ParseResult } from ".";
import type { ParsedEntity } from "@/stores/editorStore";
import { emptyBounds, expandBounds } from "@/lib/utils/geometry";

/**
 * DXF parser. We hand-roll a minimal DXF tokenizer for v1 to avoid pulling in
 * a heavy dependency that doesn't ship clean ESM. We support enough of the
 * spec to draw architectural plans: LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC,
 * TEXT, MTEXT (text only). INSERT/blocks are not expanded yet.
 */
export async function parseDxf(file: Blob): Promise<ParseResult> {
  const text = await file.text();
  const tokens = tokenize(text);
  const entities: ParsedEntity[] = [];
  const bounds = emptyBounds();
  let i = 0;
  // Find ENTITIES section
  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value === "SECTION") {
      // next pair (2, "ENTITIES" | other)
      if (tokens[i + 1]?.code === 2 && tokens[i + 1].value === "ENTITIES") {
        i += 2;
        while (i < tokens.length) {
          if (tokens[i].code === 0 && tokens[i].value === "ENDSEC") break;
          if (tokens[i].code !== 0) {
            i++;
            continue;
          }
          const type = tokens[i].value;
          const start = ++i;
          while (i < tokens.length && tokens[i].code !== 0) i++;
          const block = tokens.slice(start, i);
          parseEntity(type, block, entities, bounds);
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  if (!isFinite(bounds.minX)) {
    bounds.minX = 0;
    bounds.minY = 0;
    bounds.maxX = 100;
    bounds.maxY = 100;
  }

  return { entities, bounds };
}

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

function num(v: string) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function val(block: Tok[], code: number) {
  for (const t of block) if (t.code === code) return t.value;
  return undefined;
}

function expand(b: ReturnType<typeof emptyBounds>, x: number, y: number) {
  expandBounds(b, { x, y });
}

function parseEntity(
  type: string,
  block: Tok[],
  out: ParsedEntity[],
  b: ReturnType<typeof emptyBounds>,
) {
  switch (type) {
    case "LINE": {
      const x1 = num(val(block, 10) || "0");
      const y1 = num(val(block, 20) || "0");
      const x2 = num(val(block, 11) || "0");
      const y2 = num(val(block, 21) || "0");
      out.push({ kind: "line", ax: x1, ay: -y1, bx: x2, by: -y2 });
      expand(b, x1, -y1);
      expand(b, x2, -y2);
      break;
    }
    case "LWPOLYLINE": {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const t of block) {
        if (t.code === 10) xs.push(num(t.value));
        if (t.code === 20) ys.push(-num(t.value));
      }
      const flagsRaw = val(block, 70);
      const closed = flagsRaw ? (parseInt(flagsRaw, 10) & 1) === 1 : false;
      const pts: number[] = [];
      for (let j = 0; j < Math.min(xs.length, ys.length); j++) {
        pts.push(xs[j], ys[j]);
        expand(b, xs[j], ys[j]);
      }
      if (pts.length >= 4) out.push({ kind: "polyline", points: pts, closed });
      break;
    }
    case "POLYLINE": {
      // Followed by VERTEX entities until SEQEND — we don't accumulate those
      // here because tokenize() splits on every (0, ...). Skip for v1.
      break;
    }
    case "CIRCLE": {
      const cx = num(val(block, 10) || "0");
      const cy = -num(val(block, 20) || "0");
      const r = num(val(block, 40) || "0");
      out.push({ kind: "circle", cx, cy, r });
      expand(b, cx - r, cy - r);
      expand(b, cx + r, cy + r);
      break;
    }
    case "ARC": {
      const cx = num(val(block, 10) || "0");
      const cy = -num(val(block, 20) || "0");
      const r = num(val(block, 40) || "0");
      const start = (num(val(block, 50) || "0") * Math.PI) / 180;
      const end = (num(val(block, 51) || "0") * Math.PI) / 180;
      out.push({ kind: "arc", cx, cy, r, start: -end, end: -start });
      expand(b, cx - r, cy - r);
      expand(b, cx + r, cy + r);
      break;
    }
    case "TEXT":
    case "MTEXT": {
      const x = num(val(block, 10) || "0");
      const y = -num(val(block, 20) || "0");
      const size = num(val(block, 40) || "10") || 10;
      const text = (val(block, 1) || "").replace(/\\P/g, "\n").replace(/\\[A-Za-z]\d*;?/g, "");
      if (text) {
        out.push({ kind: "text", x, y, size, text });
        expand(b, x, y);
        expand(b, x + text.length * size * 0.5, y + size);
      }
      break;
    }
    default:
      // INSERT, HATCH, SPLINE, ELLIPSE, DIMENSION, SOLID, etc — TODO(trace).
      break;
  }
}
