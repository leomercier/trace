import type { ParseResult } from ".";

/**
 * DWG parsing requires libredwg-web (WASM) to convert to DXF, then we feed
 * that DXF into our DXF parser. The dependency isn't installed yet — leave a
 * clear TODO so the next iteration can wire it up.
 *
 * TODO(trace): install @mlightcad/libredwg-web and uncomment the conversion path.
 */
export async function parseDwg(_file: Blob): Promise<ParseResult> {
  throw new Error(
    "DWG support coming soon. For now, please export to DXF or PDF from your CAD application.",
  );
}
