"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { init, pageView } from "@/lib/analytics";

/**
 * Mounted once at the root layout. Initialises the configured analytics
 * providers (Google Analytics + Mixpanel) and emits a `page_view` event
 * on every client-side navigation. Server-rendered first paints are
 * captured by the same hook on the second render once the providers are
 * up. If neither provider is configured this component is a no-op.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const qs = search?.toString();
    pageView(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, search]);

  return null;
}
