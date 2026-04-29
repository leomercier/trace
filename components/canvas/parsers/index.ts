import type { ParsedEntity } from "@/stores/editorStore";
import type { Bounds } from "@/lib/utils/geometry";
import type { FileType } from "@/lib/supabase/types";

export interface ParseResult {
  entities: ParsedEntity[];
  bounds: Bounds;
}

export function inferFileType(name: string): FileType {
  const n = name.toLowerCase();
  if (n.endsWith(".dwg")) return "dwg";
  if (n.endsWith(".dxf")) return "dxf";
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".svg") || n.endsWith(".svgz")) return "svg";
  if (n.endsWith(".png")) return "png";
  if (
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".jpe") ||
    n.endsWith(".jfif") ||
    n.endsWith(".webp") ||
    n.endsWith(".gif") ||
    n.endsWith(".bmp")
  )
    return "jpg";
  return "other";
}

export const SUPPORTED_EXTENSIONS = [
  "dwg",
  "dxf",
  "pdf",
  "svg",
  "svgz",
  "png",
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "webp",
  "gif",
  "bmp",
];

export async function parseFile(
  file: Blob,
  type: FileType,
): Promise<ParseResult> {
  switch (type) {
    case "png":
    case "jpg":
    case "svg": {
      const m = await import("./image");
      return m.parseImage(file);
    }
    case "pdf": {
      const m = await import("./pdf");
      return m.parsePdf(file);
    }
    case "dxf": {
      const m = await import("./dxf");
      return m.parseDxf(file);
    }
    case "dwg": {
      const m = await import("./dwg");
      return m.parseDwg(file);
    }
    case "other":
      throw new Error(
        "Unsupported file type. Trace renders DWG, DXF, PDF, SVG, PNG, JPG, GIF, WEBP, and BMP.",
      );
    default:
      throw new Error(`Unsupported file type: ${type}`);
  }
}
