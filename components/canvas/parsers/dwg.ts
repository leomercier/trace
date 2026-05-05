import type { ParseResult } from ".";
import { convertDwgToDxf } from "@/lib/utils/dwg";
import { parseDxfAsync } from "./dxf-async";

export async function parseDwg(file: Blob): Promise<ParseResult> {
  const dxf = await convertDwgToDxf(file);
  if (!dxf) {
    throw new Error(
      "Could not convert this DWG. Try saving it as DXF in your CAD application.",
    );
  }
  // DWG conversion still happens on the main thread (libredwg-web's
  // blob-script bootstrap is fragile inside a worker); the DXF parse
  // afterwards goes off-thread.
  return parseDxfAsync(dxf);
}
