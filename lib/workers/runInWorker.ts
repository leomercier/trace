/**
 * One-shot RPC helper for Web Workers. Spawns a worker, posts a single
 * input, awaits one response, then terminates.
 *
 * The worker is expected to send back either the resolved value or an
 * `{ __error }` shape so we can surface errors as rejections instead of
 * silently swallowing them.
 *
 * Note: workerFactory must return a fresh `new Worker(new URL(...))` —
 * webpack/Next.js statically resolves the URL at build time. Don't try
 * to share a long-lived worker across calls; this helper terminates
 * after each call so the parser bundle isn't kept resident.
 */
export function runInWorker<I, O>(
  workerFactory: () => Worker,
  input: I,
  transfer: Transferable[] = [],
): Promise<O> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = workerFactory();
    } catch (err) {
      reject(err);
      return;
    }
    worker.onmessage = (e: MessageEvent) => {
      worker.terminate();
      const data = e.data as any;
      if (data && typeof data === "object" && "__error" in data) {
        reject(new Error(String(data.__error)));
      } else {
        resolve(data as O);
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject((e as any).error || new Error(e.message || "worker failed"));
    };
    worker.postMessage(input, transfer);
  });
}
