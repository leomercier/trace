/**
 * Convert DWG → DXF in the browser using @mlightcad/libredwg-web (WASM, GPL-3.0).
 * The DXF is what gets persisted to Supabase Storage; the original DWG is
 * discarded after upload. This keeps the server free of GPL'd code and lets
 * the existing DXF parser do all the rendering.
 *
 * We load the package's pre-built UMD bundle from jsdelivr (CORS-friendly,
 * browser-targeted — esm.sh's transformed ESM tries to use module.require
 * via the "unenv" polyfill which is incomplete and crashes the WASM init).
 *
 * `LibreDwg.create(dir)` builds `${dir}/libredwg-web.wasm` internally, so we
 * pass the directory only — no trailing slash, no filename.
 */

const VERSION = "0.7.0";
const UMD_URL = `https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@${VERSION}/dist/libredwg-web.umd.cjs`;
const WASM_DIR = `https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@${VERSION}/wasm`;

let _instance: any | null = null;
let _loadingPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing && (existing as any).__trace_loaded__) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => {
      (s as any).__trace_loaded__ = true;
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function getLibreDwg(): Promise<any> {
  if (_instance) return _instance;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    await loadScript(UMD_URL);
    // The UMD wrapper registers itself as `globalThis["libredwg-web"]`.
    // Older builds used different keys; probe a few as fallback.
    const ns: any =
      (window as any)["libredwg-web"] ||
      (window as any).libredwg_web ||
      (window as any).LibreDwgWeb ||
      (window as any).mlightcad ||
      window;
    const LibreDwg = ns.LibreDwg || (window as any).LibreDwg;
    if (!LibreDwg || typeof LibreDwg.create !== "function") {
      throw new Error(
        "LibreDwg UMD did not expose a create() factory on the global",
      );
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
