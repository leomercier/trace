import type { ParseResult } from ".";

async function loadPdfJs(): Promise<any> {
  const pdfjs: any = await import("pdfjs-dist");
  // Use the CDN-hosted worker matching this build of pdfjs-dist. Next.js
  // bundlers can be picky about ESM workers, so the CDN is the simplest path.
  const version = pdfjs.version || "4.10.38";
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

async function renderPageToPng(page: any): Promise<{ blob: Blob; w: number; h: number }> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png", 0.95),
  );
  return { blob, w: canvas.width / 2, h: canvas.height / 2 };
}

/**
 * Renders the first page of a PDF to a high-DPI canvas, then exposes it as a
 * world-space image entity. Used by the in-store parser path; for splitting
 * a multi-page PDF into separate uploadable PNG files see {@link pdfToPngFiles}.
 */
export async function parsePdf(file: Blob): Promise<ParseResult> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const { blob, w, h } = await renderPageToPng(page);
  const url = URL.createObjectURL(blob);
  return {
    entities: [{ kind: "image", x: 0, y: 0, w, h, src: url }],
    bounds: { minX: 0, minY: 0, maxX: w, maxY: h },
  };
}

/**
 * Renders every page of a PDF to its own PNG `File`. Returned files share the
 * source PDF's basename suffixed with the 1-indexed page number, and carry
 * world-space dimensions so callers can lay pages out side-by-side.
 */
export async function pdfToPngFiles(
  file: File | Blob,
  baseName: string,
): Promise<Array<{ file: File; w: number; h: number }>> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: Array<{ file: File; w: number; h: number }> = [];
  const stem = baseName.replace(/\.pdf$/i, "");
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const { blob, w, h } = await renderPageToPng(page);
    const name = doc.numPages === 1 ? `${stem}.png` : `${stem} - p${i}.png`;
    out.push({
      file: new File([blob], name, { type: "image/png" }),
      w,
      h,
    });
  }
  return out;
}
