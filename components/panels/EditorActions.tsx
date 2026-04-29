"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Package, Share2, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

/**
 * The action bar that lives at the top of the right-hand Inspector panel.
 * Contains: sandbox-banner (anonymous orgs), Inventory, Ask AI, Share,
 * presence avatars, and the user profile menu (workspace switcher,
 * duplicate, settings, sign-out). Used to be a free-floating overlay; now
 * docked inside the Inspector so the canvas stays uncluttered.
 */
export function EditorActions({
  org,
  user,
  presence,
  canEdit,
  canAdmin,
  onInventory,
  onAssistant,
  onShare,
  variant = "desktop",
}: {
  org: { id: string; slug: string; isAnonymous: boolean; expiresAt: string | null };
  user: { id: string; email: string; name: string; avatar: string | null };
  presence: { userId: string; name: string; color: string }[];
  canEdit: boolean;
  canAdmin: boolean;
  onInventory: () => void;
  onAssistant: () => void;
  onShare: () => void;
  /** "desktop" docks into Inspector header; "compact" hides text labels. */
  variant?: "desktop" | "compact";
}) {
  const supabase = createClient();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  const others = presence.filter((p) => p.userId !== user.id);
  const showLabels = variant === "desktop";

  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-panel px-2 py-2">
      {org.isAnonymous ? (
        <button
          onClick={copyShareUrl}
          title="Copy public link — anyone with this URL can collaborate"
          className="flex h-8 items-center gap-1.5 rounded-md border border-yellow-200 bg-yellow-50 px-2 text-[11px] text-yellow-900 hover:border-yellow-300"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Copied" : org.expiresAt ? `Sandbox · ${daysLeft(org.expiresAt)}` : "Sandbox"}</span>
        </button>
      ) : null}
      {canEdit ? (
        <button
          onClick={onInventory}
          title="Inventory (⌘I)"
          className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel-muted px-2 text-[11px] hover:bg-panel"
        >
          <Package size={12} /> {showLabels ? <span>Inventory</span> : null}
        </button>
      ) : null}
      <button
        onClick={onAssistant}
        title="Ask AI (⌘K)"
        className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel-muted px-2 text-[11px] hover:bg-panel"
        style={{ color: "#7c3aed" }}
      >
        <Sparkles size={12} /> {showLabels ? <span>Ask AI</span> : null}
      </button>
      {canAdmin ? (
        <button
          onClick={onShare}
          title="Share"
          className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-panel-muted px-2 text-[11px] hover:bg-panel"
        >
          <Share2 size={12} /> {showLabels ? <span>Share</span> : null}
        </button>
      ) : null}
      {others.length > 0 ? (
        <div className="ml-auto flex items-center" title={others.map((o) => o.name).join(", ")}>
          <div className="flex -space-x-2">
            {others.slice(0, 4).map((u) => (
              <div key={u.userId} className="rounded-full border-2 border-panel" title={u.name}>
                <Avatar name={u.name} color={u.color} size={20} />
              </div>
            ))}
            {others.length > 4 ? (
              <span className="ml-2 self-center text-[10px] text-ink-faint">
                +{others.length - 4}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        ref={profileRef}
        className={`relative ${others.length > 0 ? "" : "ml-auto"}`}
      >
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center rounded-full p-0.5 hover:bg-panel-muted"
          aria-label="Profile"
          title={user.email || "Profile"}
        >
          <Avatar name={user.name} src={user.avatar} size={26} />
        </button>
        {profileOpen ? (
          <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-md border border-border bg-panel p-1 shadow-lg">
            <div className="px-3 py-2 text-xs text-ink-faint">
              {user.email || "Anonymous session"}
            </div>
            {org.isAnonymous ? (
              <a
                href="/signup"
                className="mx-1 mb-1 block rounded bg-ink px-3 py-2 text-sm text-white hover:bg-black/90"
              >
                Sign in to keep this workspace
              </a>
            ) : null}
            <a
              href="/app"
              className="block rounded px-3 py-2 text-sm hover:bg-panel-muted"
            >
              Switch workspace
            </a>
            <button
              onClick={async () => {
                setProfileOpen(false);
                if (
                  !confirm(
                    "Duplicate this workspace including all projects, pages, and annotations?",
                  )
                )
                  return;
                const res = await fetch("/api/orgs/duplicate", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ source_org_id: org.id }),
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
              <a
                href={`/app/${org.slug}/settings`}
                className="block rounded px-3 py-2 text-sm hover:bg-panel-muted"
              >
                Workspace settings
              </a>
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
    </div>
  );
}

function daysLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.ceil(ms / (24 * 3600 * 1000));
  return days === 1 ? "1d" : `${days}d`;
}
