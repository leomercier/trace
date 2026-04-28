"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function ShareDialog({
  open,
  onClose,
  scope,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  scope: "project" | "page";
  targetId: string;
}) {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [allowComments, setAllowComments] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const res = await fetch(`/api/shares?scope=${scope}&id=${targetId}`);
    const json = await res.json();
    setShares(json.shares || []);
    setLoading(false);
  }

  useEffect(() => {
    if (open) refresh();
  }, [open, scope, targetId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/shares", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scope,
        target_id: targetId,
        password: password || null,
        allow_comments: allowComments,
      }),
    });
    setPassword("");
    setAllowComments(false);
    await refresh();
  }

  async function onRevoke(id: string) {
    setLoading(true);
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    await refresh();
  }

  function copyUrl(slug: string) {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Share ${scope}`} className="max-w-lg">
      <form onSubmit={onCreate} className="space-y-3">
        <div>
          <Label htmlFor="pw">Password (optional)</Label>
          <Input
            id="pw"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank for no password"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowComments}
            onChange={(e) => setAllowComments(e.target.checked)}
            className="accent-ink"
          />
          Allow guest comments (notes only)
        </label>
        <Button type="submit" loading={loading} className="w-full">
          Create share link
        </Button>
      </form>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-wider text-ink-faint">Active links</div>
        <ul className="mt-2 space-y-2">
          {shares.length === 0 ? (
            <li className="text-sm text-ink-muted">No active links.</li>
          ) : null}
          {shares.map((s) => {
            const url =
              typeof window !== "undefined" ? `${window.location.origin}/p/${s.slug}` : `/p/${s.slug}`;
            return (
              <li key={s.id} className="rounded-md border border-border bg-panel-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-num text-sm">{url}</div>
                    <div className="mt-1 text-[11px] text-ink-faint">
                      {s.password_hash ? "Password protected" : "No password"}
                      {s.allow_comments ? " · Guests can comment" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => copyUrl(s.slug)}
                    className="rounded border border-border bg-panel p-2 hover:border-border-strong"
                    title="Copy link"
                  >
                    {copiedSlug === s.slug ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => onRevoke(s.id)}
                    className="rounded border border-border bg-panel p-2 text-measure hover:border-border-strong"
                    title="Revoke"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
