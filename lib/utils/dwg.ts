/**
 * Convert DWG → DXF in the browser using @mlightcad/libredwg-web (WASM).
 * The DXF is what gets persisted to Supabase Storage; the original DWG is
 * discarded after upload. This keeps the server free of GPL'd code and lets
 * the existing DXF parser do all the rendering.
 *
 * We load the library from a CDN at runtime instead of bundling it: the
 * WASM is ~24MB and webpack chokes trying to traverse the package's module
 * graph. The CDN load is cached by the browser, so it's a one-time cost
 * per visitor.
 */

const VERSION = "0.7.0";
const CDN_BASE = `https://unpkg.com/@mlightcad/libredwg-web@${VERSION}`;

declare global {
  interface Window {
    mlightcad?: any;
    LibreDwg?: any;
  }
}

let _instance: any | null = null;
let _loadingPromise: Promise<any> | null = null;

async function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function getLibreDwg(): Promise<any> {
  if (_instance) return _instance;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    // The UMD bundle exposes the API on window. Different versions have
    // exposed it under different globals — probe a couple of common names.
    await loadScript(`${CDN_BASE}/dist/libredwg-web.umd.cjs`);
    const ns = (window as any).mlightcad || (window as any).LibreDwgWeb || window;
    const LibreDwg =
      ns.LibreDwg || (window as any).LibreDwg || (window as any).libredwg;
    if (!LibreDwg) throw new Error("LibreDwg UMD did not expose a global");
    const wasmUrl =
      process.env.NEXT_PUBLIC_LIBREDWG_WASM_URL ||
      `${CDN_BASE}/wasm/libredwg-web.wasm`;
    _instance = await LibreDwg.create(wasmUrl);
    return _instance;
  })();

  return _loadingPromise;
}

export async function convertDwgToDxf(dwg: Blob): Promise<Blob | null> {
  try {
    const buf = await dwg.arrayBuffer();
    const lib = await getLibreDwg();
    const out: Uint8Array | null = lib.dwg_write_dxf(buf);
    if (!out || out.length === 0) return null;
    const copy = new Uint8Array(out.length);
    copy.set(out);
    return new Blob([copy.buffer], { type: "application/dxf" });
  } catch (err) {
    console.error("[trace] DWG conversion failed:", err);
    return null;
  }
}
