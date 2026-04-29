"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export function OrgTopBar({
  org,
  role,
  user,
  hideOnMobile,
}: {
  org: { id: string; name: string; slug: string };
  role: "owner" | "admin" | "editor" | "viewer";
  user: { id: string; email: string; name: string; avatar_url: string | null };
  hideOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  return (
    <header
      className={cn(
        "org-top-bar sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur",
        hideOnMobile && "hidden md:block",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/app" className="font-serif text-xl">
            tracable
          </Link>
          <span className="text-ink-faint">/</span>
          <Link
            href={`/app/${org.slug}`}
            className="rounded px-2 py-1 text-sm hover:bg-panel-muted"
          >
            {org.name}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {(role === "owner" || role === "admin") && (
            <Link
              href={`/app/${org.slug}/settings`}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-ink-muted hover:text-ink"
            >
              <Settings size={14} />
              Settings
            </Link>
          )}
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded p-1 hover:bg-panel-muted"
            >
              <Avatar name={user.name} src={user.avatar_url} size={28} />
              <ChevronDown size={14} className="text-ink-faint" />
            </button>
            {open ? (
              <div className="absolute right-0 mt-1 w-56 rounded-md border border-border bg-panel p-1 shadow-md">
                <div className="px-3 py-2 text-xs text-ink-faint">{user.email}</div>
                <Link
                  href="/app"
                  className="block rounded px-3 py-2 text-sm hover:bg-panel-muted"
                >
                  Switch workspace
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                    router.refresh();
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-panel-muted"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
