import * as PIXI from "pixi.js";

// Per-layer render durations are written to this global by `timeRender()`
// so the HUD can display them without each layer needing to know about it.
declare global {
  interface Window {
    __tracePerf?: Record<string, number>;
  }
}

/**
 * Dev-only on-screen FPS / per-layer-render-time HUD. Mounted on
 * `app.stage` (NOT `viewport.world`) so it stays fixed in the corner
 * regardless of pan/zoom. Toggle with `?perf=1` or
 * `localStorage.tracePerfHud = "1"`.
 */
export class PerfHud {
  private wrap = new PIXI.Container();
  private bg = new PIXI.Graphics();
  private text: PIXI.Text;
  private app: PIXI.Application;
  private fpsEma = 60;
  private frameCount = 0;
  private lastFpsTs = performance.now();
  private lastPaintTs = 0;

  constructor(app: PIXI.Application) {
    this.app = app;
    this.text = new PIXI.Text({
      text: "perf …",
      style: {
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        fontSize: 11,
        fill: 0x111111,
        lineHeight: 14,
      },
    });
    this.text.position.set(0, 0);
    this.wrap.label = "perf-hud";
    this.wrap.eventMode = "none";
    this.wrap.addChild(this.bg);
    this.wrap.addChild(this.text);
    this.wrap.position.set(8, 8);
    app.stage.addChild(this.wrap);

    if (typeof window !== "undefined") {
      window.__tracePerf = window.__tracePerf || {};
    }

    app.ticker.add(this.tick, this);
    this.repaintBg();
  }

  destroy() {
    this.app.ticker.remove(this.tick, this);
    this.wrap.destroy({ children: true });
  }

  private tick = () => {
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFpsTs >= 500) {
      const fps = (this.frameCount * 1000) / (now - this.lastFpsTs);
      this.fpsEma = this.fpsEma * 0.4 + fps * 0.6;
      this.frameCount = 0;
      this.lastFpsTs = now;
    }
    if (now - this.lastPaintTs < 250) return;
    this.lastPaintTs = now;

    const perf = (typeof window !== "undefined" && window.__tracePerf) || {};
    const lines = [
      `fps ${this.fpsEma.toFixed(0).padStart(2)}  Δ${this.app.ticker.deltaMS.toFixed(1)}ms`,
      `zoom ${(this.app.stage.children[0] as PIXI.Container | undefined)?.scale.x?.toFixed(2) ?? "?"}`,
    ];
    const keys = Object.keys(perf).sort();
    for (const k of keys) {
      lines.push(`${k.padEnd(9)} ${perf[k].toFixed(2)}ms`);
    }
    this.text.text = lines.join("\n");
    this.repaintBg();
  };

  private repaintBg() {
    this.bg.clear();
    this.bg
      .roundRect(-6, -4, this.text.width + 12, this.text.height + 8, 4)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .stroke({ color: 0xd6d3d1, width: 1 });
  }
}

export function isPerfHudEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("perf") === "1") return true;
    if (window.localStorage?.getItem("tracePerfHud") === "1") return true;
  } catch {}
  return false;
}

/**
 * Wrap a layer render call to time it and surface the duration in the
 * HUD. No-op when the HUD's global isn't initialised, so this stays
 * cheap in production.
 */
export function timeRender(label: string, fn: () => void): void {
  if (typeof window === "undefined" || !window.__tracePerf) {
    fn();
    return;
  }
  const t0 = performance.now();
  fn();
  window.__tracePerf[label] = performance.now() - t0;
}
