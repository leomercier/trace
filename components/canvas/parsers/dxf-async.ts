import type { ParseResult } from ".";
import { parseDxf as parseDxfSync } from "./dxf";
import { runInWorker } from "@/lib/workers/runInWorker";

/**
 * Off-thread DXF parse. Falls back to the synchronous parser if the
 * worker couldn't be created (older browsers without ESM-worker
 * support, bundler edge cases, missing-permission contexts) so DXF
 * imports never break — they may just freeze the UI for a bit on
 * unsupported environments, which matches today's behaviour.
 */
export async function parseDxfAsync(file: Blob): Promise<ParseResult> {
  if (typeof Worker === "undefined") {
    return parseDxfSync(file);
  }
  try {
    const buf = await file.arrayBuffer();
    return await runInWorker<{ buf: ArrayBuffer }, ParseResult>(
      () => new Worker(new URL("./dxf.worker.ts", import.meta.url)),
      { buf },
      [buf],
    );
  } catch (err) {
    console.warn("[trace] DXF worker failed, falling back to sync parse", err);
    return parseDxfSync(file);
  }
}
