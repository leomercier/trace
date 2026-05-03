/// <reference lib="webworker" />

import { parseDxf } from "./dxf";

/**
 * Worker entry: receives an ArrayBuffer (the DXF file contents) and
 * returns a `{ entities, bounds }` ParseResult. Heavy DXF files that
 * used to freeze the main thread for seconds now parse off-thread.
 */
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<{ buf: ArrayBuffer }>) => {
  try {
    const { buf } = e.data;
    const blob = new Blob([buf]);
    const result = await parseDxf(blob);
    ctx.postMessage(result);
  } catch (err) {
    ctx.postMessage({
      __error: (err as Error)?.message || String(err),
    });
  }
};
