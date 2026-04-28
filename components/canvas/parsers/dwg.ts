import type { ParseResult } from ".";
import { convertDwgToDxf } from "@/lib/utils/dwg";
import { parseDxf } from "./dxf";

export async function parseDwg(file: Blob): Promise<ParseResult> {
  const dxf = await convertDwgToDxf(file);
  if (!dxf) {
    throw new Error(
      "Could not convert this DWG. Try saving it as DXF in your CAD application.",
    );
  }
  return parseDxf(dxf);
}
