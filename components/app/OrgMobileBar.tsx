"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronLeft, Settings, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

/**
 * Compact mobile-only top bar for org-scoped pages OUTSIDE the editor route.
 * Inside the editor, EditorMobileBar takes over and this bar is hidden via
 * the `org-mobile-bar` class + a sibling CSS rule.
 */
export function OrgMobileBar({
  org,
  role,
  user,
}: {
  org: { id: string; name: string; slug: string };
  role: "owner" | "admin" | "editor" | "viewer";
  user: { id: string; email: string; name: string; avatar_url: string | null };
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [open]);

  const canAdmin = role === "owner" || role === "admin";

  return (
    <header className="org-mobile-bar sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div ref={wrapRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-panel hover:border-border-strong"
          >
            <Menu size={16} />
          </button>
          {open ? (
            <div className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-md border border-border bg-panel shadow-lg">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-ink-faint">
                {org.name}
              </div>
              <Link
                href="/app"
                className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-panel-muted"
                onClick={() => setOpen(false)}
              >
                <ChevronLeft size={14} className="text-ink-muted" />
                Switch workspace
              </Link>
              {canAdmin ? (
                <Link
                  href={`/app/${org.slug}/settings`}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-panel-muted"
                  onClick={() => setOpen(false)}
                >
                  <Settings size={14} className="text-ink-muted" />
                  Workspace settings
                </Link>
              ) : null}
              <div className="border-t border-border" />
              <div className="px-3 py-2 text-xs text-ink-faint">{user.email}</div>
              <button
                onClick={async () => {
                  setOpen(false);
                  await supabase.auth.signOut();
                  router.push("/");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-panel-muted"
              >
                <LogOut size={14} className="text-ink-muted" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-serif text-base">{org.name}</div>
        </div>
        <Link href={`/app/${org.slug}`}>
          <Avatar name={user.name} src={user.avatar_url} size={28} />
        </Link>
      </div>
    </header>
  );
}
