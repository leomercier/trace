/**
 * Lightweight analytics for Trace. Wraps Google Analytics (gtag) and
 * Mixpanel behind one tiny `track(event, properties?)` call so feature
 * code doesn't have to know which providers are wired up.
 *
 * Both providers are optional — if their respective env vars aren't set,
 * `init()` is a no-op and `track()` quietly drops events. This keeps
 * self-hosters and forks from being forced to create accounts.
 *
 * The provider scripts are loaded lazily on the client only, after
 * `init()` is called from the analytics provider component. Server-side
 * code never imports the script loader, so SSR is unaffected.
 *
 * Typical usage from a feature:
 *
 *   import { track } from "@/lib/analytics";
 *   track("project_create", { source: "dashboard" });
 *
 * Page views are emitted automatically by `<AnalyticsListener />`.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    mixpanel?: any;
  }
}

type Props = Record<string, string | number | boolean | null | undefined>;

let started = false;

export function gaId(): string | null {
  // Inlined at build time by Next; falls back to null when missing.
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
}

export function mixpanelToken(): string | null {
  return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || null;
}

/**
 * Idempotent. Loads both provider scripts (if configured) on first call
 * and wires up no-op shims so feature code can call `track()`/`identify()`
 * before the scripts actually finish loading.
 */
export function init(): void {
  if (typeof window === "undefined" || started) return;
  started = true;

  const ga = gaId();
  const mp = mixpanelToken();

  if (ga) {
    window.dataLayer = window.dataLayer || [];
    // Standard GA4 bootstrap. We replace gtag with a queue first so
    // calls made before the script loads aren't lost.
    const w = window as any;
    if (!w.gtag) w.gtag = function () { (window.dataLayer as any).push(arguments); };
    window.gtag!("js", new Date());
    // We disable automatic page_view to avoid double-counting with the
    // Next.js client navigation listener; route events fire from
    // <AnalyticsListener />.
    window.gtag!("config", ga, { send_page_view: false });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${ga}`, true);
  }

  if (mp) {
    // Tiny inline stub mirroring the Mixpanel snippet — queues calls
    // before the real lib finishes loading. We only stub the surface
    // we actually call.
    if (!window.mixpanel) {
      const stub: any = {
        _q: [] as any[],
        track: (...args: any[]) => stub._q.push(["track", args]),
        identify: (...args: any[]) => stub._q.push(["identify", args]),
        people: { set: (...args: any[]) => stub._q.push(["people.set", args]) },
        register: (...args: any[]) => stub._q.push(["register", args]),
        reset: (...args: any[]) => stub._q.push(["reset", args]),
      };
      window.mixpanel = stub;
    }
    loadScript("https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js", true, () => {
      try {
        window.mixpanel?.init?.(mp, { track_pageview: false, persistence: "localStorage" });
        // Drain any calls made while the stub was up.
        const queued = (window as any).mixpanel?._q;
        if (Array.isArray(queued)) {
          for (const [name, args] of queued) {
            const path = name.split(".");
            let target: any = window.mixpanel;
            for (let i = 0; i < path.length - 1; i++) target = target?.[path[i]];
            target?.[path[path.length - 1]]?.(...args);
          }
        }
      } catch (err) {
        console.warn("[analytics] mixpanel init failed", err);
      }
    });
  }
}

/**
 * Emit one event to every configured provider. Silently drops in dev or
 * when nothing is configured. Properties should be flat strings/numbers
 * — nested objects are accepted but not all providers will surface them
 * the same way.
 */
export function track(event: string, properties?: Props): void {
  if (typeof window === "undefined") return;
  try {
    if (gaId() && window.gtag) {
      window.gtag("event", event, properties || {});
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[analytics] ga track failed", err);
  }
  try {
    if (mixpanelToken() && window.mixpanel?.track) {
      window.mixpanel.track(event, properties);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[analytics] mixpanel track failed", err);
  }
}

/**
 * Tag the current visitor with a stable user id and optional traits.
 * Call once per session after login; safe to call multiple times.
 */
export function identify(userId: string, traits?: Props): void {
  if (typeof window === "undefined") return;
  try {
    if (gaId() && window.gtag) {
      window.gtag("set", { user_id: userId });
      if (traits) window.gtag("set", "user_properties", traits);
    }
  } catch {}
  try {
    if (mixpanelToken() && window.mixpanel?.identify) {
      window.mixpanel.identify(userId);
      if (traits) window.mixpanel.people?.set?.(traits);
    }
  } catch {}
}

/**
 * Emit a page-view event for the given path. Called from
 * `<AnalyticsListener />` on every Next.js client-side navigation.
 */
export function pageView(path: string): void {
  if (typeof window === "undefined") return;
  try {
    if (gaId() && window.gtag) {
      window.gtag("event", "page_view", { page_path: path, page_location: window.location.href });
    }
  } catch {}
  try {
    if (mixpanelToken() && window.mixpanel?.track) {
      window.mixpanel.track("page_view", { path });
    }
  } catch {}
}

/**
 * Resets per-user state on sign-out so the next session starts fresh.
 * Mostly relevant on shared computers.
 */
export function reset(): void {
  if (typeof window === "undefined") return;
  try {
    window.mixpanel?.reset?.();
  } catch {}
}

function loadScript(src: string, async: boolean, onload?: () => void) {
  if (document.querySelector(`script[src="${src}"]`)) {
    onload?.();
    return;
  }
  const s = document.createElement("script");
  s.src = src;
  s.async = async;
  s.onload = () => onload?.();
  document.head.appendChild(s);
}

/**
 * Convenience: enumerate the canonical event names so feature code stays
 * consistent with what dashboards expect. Adding a name here is cheap;
 * leaving call-sites typing free-form strings is how analytics drifts.
 */
export const EVENTS = {
  signup: "signup",
  login: "login",
  signout: "signout",
  projectCreate: "project_create",
  projectOpen: "project_open",
  pageCreate: "page_create",
  pageDelete: "page_delete",
  pageRename: "page_rename",
  drawingUpload: "drawing_upload",
  drawingDelete: "drawing_delete",
  measurementCreate: "measurement_create",
  shapeCreate: "shape_create",
  noteCreate: "note_create",
  itemPlace: "item_place",
  itemDelete: "item_delete",
  calibrate: "calibrate",
  scaleCalibrated: "scale_calibrated",
  share: "share_link_create",
  shareCopy: "share_link_copy",
  inviteSend: "invite_send",
  aiAssistantOpen: "ai_assistant_open",
  aiAssistantPrompt: "ai_assistant_prompt",
  exportPng: "export_png",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
