import type { ParseResult } from ".";

export async function parseImage(file: Blob): Promise<ParseResult> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  return {
    entities: [{ kind: "image", x: 0, y: 0, w, h, src: url }],
    bounds: { minX: 0, minY: 0, maxX: w, maxY: h },
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
