/**
 * Per-id throttle: at most one `fn(item)` per `ms` window per id, with a
 * trailing-edge flush so the final value during a drag is always
 * eventually written. Used to keep Supabase writes bounded during
 * high-frequency pointer drags without giving up the optimistic
 * in-store updates.
 */
export function createPerIdThrottle<T extends { id: string }>(
  ms: number,
  fn: (item: T) => void | Promise<void>,
): {
  schedule: (item: T) => void;
  flush: (id: string) => void;
} {
  interface Entry {
    lastRun: number;
    pending: T | null;
    timer: ReturnType<typeof setTimeout> | null;
  }
  const state = new Map<string, Entry>();

  const run = (id: string) => {
    const s = state.get(id);
    if (!s || !s.pending) return;
    const item = s.pending;
    s.pending = null;
    s.lastRun = Date.now();
    if (s.timer) {
      clearTimeout(s.timer);
      s.timer = null;
    }
    void fn(item);
  };

  return {
    schedule(item: T) {
      let s = state.get(item.id);
      if (!s) {
        s = { lastRun: 0, pending: null, timer: null };
        state.set(item.id, s);
      }
      s.pending = item;
      const since = Date.now() - s.lastRun;
      if (since >= ms) {
        run(item.id);
      } else if (!s.timer) {
        s.timer = setTimeout(() => run(item.id), ms - since);
      }
    },
    flush(id: string) {
      run(id);
    },
  };
}
