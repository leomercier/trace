import type { ParseResult } from ".";

/**
 * Renders the first page of a PDF to a high-DPI canvas, then exposes it as a
 * world-space image entity.
 */
export async function parsePdf(file: Blob): Promise<ParseResult> {
  const pdfjs: any = await import("pdfjs-dist");
  // Use the CDN-hosted worker matching this build of pdfjs-dist. Next.js
  // bundlers can be picky about ESM workers, so the CDN is the simplest path.
  const version = pdfjs.version || "4.10.38";
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
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
  const url = URL.createObjectURL(blob);

  const w = canvas.width / 2;
  const h = canvas.height / 2;

  return {
    entities: [{ kind: "image", x: 0, y: 0, w, h, src: url }],
    bounds: { minX: 0, minY: 0, maxX: w, maxY: h },
  };
}
