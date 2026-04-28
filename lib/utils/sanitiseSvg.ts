import DOMPurify from "isomorphic-dompurify";

/**
 * Strip everything but a tight allowlist from an AI-generated SVG. Returns
 * null if the result is suspiciously empty (likely malicious input that got
 * scrubbed entirely).
 */
export function sanitiseSvg(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith("<svg")) return null;

  const cleaned = DOMPurify.sanitize(trimmed, {
    USE_PROFILES: { svg: true, svgFilters: false },
    FORBID_TAGS: ["foreignObject", "script", "iframe", "object", "embed", "image"],
    FORBID_ATTR: ["onload", "onclick", "onerror", "xlink:href", "href"],
  });

  if (!cleaned || cleaned.length < trimmed.length * 0.5) return null;
  if (!cleaned.includes("<svg")) return null;
  return cleaned;
}
