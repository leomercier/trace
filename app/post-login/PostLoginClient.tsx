"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function PostLoginClient({ next }: { next: string }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let pendingOrg: { name?: string } | null = null;
    try {
      const raw = window.localStorage.getItem("trace.pending_org");
      if (raw) pendingOrg = JSON.parse(raw);
    } catch {}

    (async () => {
      if (pendingOrg?.name) {
        try {
          await fetch("/api/orgs/create", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: pendingOrg.name }),
          });
        } catch {}
        try {
          window.localStorage.removeItem("trace.pending_org");
        } catch {}
      }
      router.replace(next);
    })();
  }, [router, next]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="text-ink-muted">Setting things up…</div>
    </div>
  );
}
