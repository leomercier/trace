"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Maximize2,
  Package,
  Share2,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PageMenu } from "./PageMenu";
import { createClient } from "@/lib/supabase/client";

interface PageRow {
  id: string;
  name: string;
}

/**
 * The single top bar shown above the editor canvas. Replaces the old
 * OrgTopBar (brand + breadcrumb) and the floating "Fit / Inventory / Ask AI
 * / Share" action row, merging both into one ~48px row:
 *
 *  [hamburger] [page name]        [Fit] [Inventory] [AI] [presence] [Share] [profile]
 */
export function EditorTopBar({
  orgId,
  orgSlug,
  isAnonymous,
  expiresAt,
  projectId,
  projectName,
  currentPageId,
  currentPageName,
  pages,
  user,
  role,
  presence,
  onFit,
  onInventory,
  onAssistant,
  onShare,
  onDeletePage,
}: {
  orgId: string;
  isAnonymous: boolean;
  expiresAt: string | null;
  orgSlug: string;
  projectId: string;
  projectName: string;
  currentPageId: string;
  currentPageName: string;
  pages: PageRow[];
  user: { id: string; email: string; name: string; avatar: string | null };
  role: "owner" | "admin" | "editor" | "viewer";
  presence: { userId: string; name: string; color: string }[];
  onFit: () => void;
  onInventory: () => void;
  onAssistant: () => void;
  onShare: () => void;
  onDeletePage: (id: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  function copyShareUrl() {
    if (typeof window === "undefined") return;
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: Event) => {
      if (!profileRef.current?.contains(e.target as any)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [profileOpen]);

  const canEdit = role !== "viewer";
  const canAdmin = role === "owner" || role === "admin";
  const others = presence.filter((p) => p.userId !== user.id);

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-bg/90 px-2 backdrop-blur">
      <PageMenu
        orgSlug={orgSlug}
        projectId={projectId}
        projectName={projectName}
        currentPageId={currentPageId}
        pages={pages}
        canEdit={canEdit}
        canAdmin={canAdmin}
        onDeletePage={onDeletePage}
      />

      <div className="hidden min-w-0 truncate text-sm text-ink-muted md:block">
        <span className="text-ink">{currentPageName}</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={onFit}
        title="Fit to content (F)"
        className="hidden h-8 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 text-xs hover:border-border-strong md:flex"
      >
        <Maximize2 size={13} /> Fit
      </button>

      {canEdit ? (
        <button
          onClick={onInventory}
          title="Inventory (⌘I)"
          className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 text-xs hover:border-border-strong"
        >
          <Package size={13} /> <span className="hidden md:inline">Inventory</span>
        </button>
      ) : null}

      <button
        onClick={onAssistant}
        title="Ask AI (⌘K)"
        className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 text-xs hover:border-border-strong"
        style={{ color: "#7c3aed" }}
      >
        <Sparkles size={13} /> <span className="hidden md:inline">Ask AI</span>
      </button>

      {others.length > 0 ? (
        <div className="hidden items-center gap-0 md:flex">
          <div className="flex -space-x-2">
            {others.slice(0, 4).map((u) => (
              <div key={u.userId} className="rounded-full border-2 border-bg" title={u.name}>
                <Avatar name={u.name} color={u.color} size={24} />
              </div>
            ))}
          </div>
          {others.length > 4 ? (
            <span className="ml-2 text-[11px] text-ink-muted">+{others.length - 4}</span>
          ) : null}
        </div>
      ) : null}

      {canAdmin ? (
        <button
          onClick={onShare}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 text-xs hover:border-border-strong"
        >
          <Share2 size={13} /> <span className="hidden md:inline">Share</span>
        </button>
      ) : null}

      {role === "viewer" ? (
        <span className="rounded-md border border-border bg-panel px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted">
          Viewing
        </span>
      ) : null}

      {isAnonymous ? (
        <>
          <button
            onClick={copyShareUrl}
            title="Copy public link — anyone with this URL can collaborate"
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 text-xs hover:border-border-strong"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span className="hidden md:inline">
              {copied ? "Copied" : "Copy link"}
            </span>
          </button>
          <span
            className="hidden rounded-md border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-yellow-800 md:inline"
            title={
              expiresAt
                ? `Sandbox — expires ${new Date(expiresAt).toLocaleString()}`
                : "Sandbox workspace"
            }
          >
            Sandbox · {expiresAt ? daysLeft(expiresAt) : "7d"}
          </span>
        </>
      ) : null}

      <div ref={profileRef} className="relative">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-1 rounded-md p-0.5 hover:bg-panel-muted"
          aria-label="Profile"
        >
          <Avatar name={user.name} src={user.avatar} size={28} />
          <ChevronDown size={12} className="text-ink-faint" />
        </button>
        {profileOpen ? (
          <div className="absolute right-0 top-full mt-1 w-60 rounded-md border border-border bg-panel p-1 shadow-md">
            <div className="px-3 py-2 text-xs text-ink-faint">
              {user.email || "Anonymous session"}
            </div>
            {isAnonymous ? (
              <Link
                href="/signup"
                className="mx-1 mb-1 block rounded bg-ink px-3 py-2 text-sm text-white hover:bg-black/90"
              >
                Sign in to keep this workspace
              </Link>
            ) : null}
            <Link
              href="/app"
              className="block rounded px-3 py-2 text-sm hover:bg-panel-muted"
            >
              Switch workspace
            </Link>
            <button
              onClick={async () => {
                setProfileOpen(false);
                if (!confirm("Duplicate this workspace including all projects, pages, and annotations?")) return;
                const res = await fetch("/api/orgs/duplicate", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ source_org_id: orgId }),
                });
                const json = await res.json();
                if (!res.ok) {
                  alert(json.error || "Duplicate failed");
                  return;
                }
                window.location.href = `/app/${json.org.slug}`;
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-panel-muted"
            >
              <Copy size={14} /> Duplicate workspace
            </button>
            {canAdmin ? (
              <Link
                href={`/app/${orgSlug}/settings`}
                className="block rounded px-3 py-2 text-sm hover:bg-panel-muted"
              >
                Workspace settings
              </Link>
            ) : null}
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
    </header>
  );
}

function daysLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.ceil(ms / (24 * 3600 * 1000));
  return days === 1 ? "1d left" : `${days}d left`;
}
