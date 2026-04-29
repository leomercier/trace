/**
 * Convert DWG → DXF in the browser using @mlightcad/libredwg-web (WASM, GPL-3.0).
 * The DXF is what gets persisted to Supabase Storage; the original DWG is
 * discarded after upload. This keeps the server free of GPL'd code and lets
 * the existing DXF parser do all the rendering.
 *
 * Loaded via esm.sh / jsdelivr at runtime so webpack never sees the 24MB
 * package's module graph (it would stack-overflow). Both CDNs set
 * Access-Control-Allow-Origin: * which we need for the WASM cross-origin
 * fetch — unpkg does NOT set CORS for .wasm.
 *
 * `LibreDwg.create(dir)` builds `${dir}/libredwg-web.wasm` internally, so we
 * pass the directory (no trailing slash, no filename).
 */

const VERSION = "0.7.0";
const ESM_MODULE = `https://esm.sh/@mlightcad/libredwg-web@${VERSION}`;
const WASM_DIR = `https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@${VERSION}/wasm`;

let _instance: any | null = null;
let _loadingPromise: Promise<any> | null = null;

async function getLibreDwg(): Promise<any> {
  if (_instance) return _instance;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    // webpackIgnore tells webpack to leave this URL alone at build time.
    const mod: any = await import(/* webpackIgnore: true */ ESM_MODULE);
    const LibreDwg = mod.LibreDwg || mod.default?.LibreDwg || mod.default;
    if (!LibreDwg || typeof LibreDwg.create !== "function") {
      throw new Error("LibreDwg ESM did not expose a create() factory");
    }
    const dir = process.env.NEXT_PUBLIC_LIBREDWG_WASM_DIR || WASM_DIR;
    _instance = await LibreDwg.create(dir);
    return _instance;
  })();

  try {
    return await _loadingPromise;
  } catch (err) {
    _loadingPromise = null;
    throw err;
  }
}

export async function convertDwgToDxf(dwg: Blob): Promise<Blob | null> {
  try {
    const buf = await dwg.arrayBuffer();
    const lib = await getLibreDwg();
    const out: Uint8Array | null = lib.dwg_write_dxf(buf);
    if (!out || out.length === 0) {
      console.warn(
        "[trace] dwg_write_dxf returned empty; DWG version may be unsupported",
      );
      return null;
    }
    const copy = new Uint8Array(out.length);
    copy.set(out);
    return new Blob([copy.buffer], { type: "application/dxf" });
  } catch (err) {
    console.error("[trace] DWG conversion failed:", err);
    return null;
  }
}
