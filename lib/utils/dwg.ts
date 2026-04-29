/**
 * Convert DWG → DXF in the browser using @mlightcad/libredwg-web (WASM, GPL-3.0).
 * The DXF is what gets persisted to Supabase Storage; the original DWG is
 * discarded after upload. This keeps the server free of GPL'd code and lets
 * the existing DXF parser do all the rendering.
 *
 * Loading is fiddly because:
 *  - We can't bundle the package (24MB module graph stack-overflows webpack).
 *  - esm.sh transforms the package into ESM but uses Node-env polyfills
 *    ("unenv") that don't implement `module.require` — the WASM bootstrap
 *    crashes on init.
 *  - jsdelivr serves the package's UMD as `application/node` because of the
 *    .cjs extension, and modern browsers refuse to execute scripts with
 *    that MIME type.
 *  - unpkg serves WASM without `Access-Control-Allow-Origin`.
 *
 * The fix that actually works: fetch the UMD source as text, re-host it as
 * a Blob with `application/javascript` MIME, then load THAT via a <script>
 * tag. The WASM file is fetched separately by the package using the
 * directory we hand it; jsdelivr does serve .wasm with proper CORS.
 */

const VERSION = "0.7.0";
const UMD_URL = `https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@${VERSION}/dist/libredwg-web.umd.cjs`;
const WASM_DIR = `https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@${VERSION}/wasm`;

let _instance: any | null = null;
let _loadingPromise: Promise<any> | null = null;
let _scriptInjected = false;

async function injectAsBlobScript(src: string): Promise<void> {
  if (_scriptInjected) return;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch ${src}: ${res.status}`);
  const code = await res.text();
  const blob = new Blob([code], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = blobUrl;
    s.async = true;
    s.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve();
    };
    s.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to execute ${src}`));
    };
    document.head.appendChild(s);
  });
  _scriptInjected = true;
}

async function getLibreDwg(): Promise<any> {
  if (_instance) return _instance;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    await injectAsBlobScript(UMD_URL);
    // The UMD wrapper registers itself as `globalThis["libredwg-web"]`.
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
