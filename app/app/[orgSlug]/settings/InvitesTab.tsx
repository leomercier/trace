"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { OrganisationInvite, OrgRole } from "@/lib/supabase/types";

const ROLES: OrgRole[] = ["admin", "editor", "viewer"];

export function InvitesTab({
  orgId,
  initial,
}: {
  orgId: string;
  initial: OrganisationInvite[];
}) {
  const router = useRouter();
  const [invites, setInvites] = useState(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [createdLinks, setCreatedLinks] = useState<Record<string, string>>({});

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organisation_id: orgId, email, role }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setEmail("");
    setInvites([json.invite, ...invites]);
    setCreatedLinks({ ...createdLinks, [json.invite.id]: json.accept_url });
    router.refresh();
  }

  async function revoke(id: string) {
    await fetch(`/api/invites/${id}`, { method: "DELETE" });
    setInvites(invites.filter((i) => i.id !== id));
  }

  function copy(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="mt-4">
      <form onSubmit={onInvite} className="grid gap-3 rounded-md border border-border bg-panel p-4 md:grid-cols-[1fr_140px_auto]">
        <div>
          <Label htmlFor="ie">Email</Label>
          <Input
            id="ie"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@studio.com"
          />
        </div>
        <div>
          <Label htmlFor="ir">Role</Label>
          <select
            id="ir"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            className="h-10 w-full rounded-md border border-border bg-panel px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" loading={loading} className="w-full md:w-auto">
            Send invite
          </Button>
        </div>
        {error ? <p className="md:col-span-3 text-sm text-measure">{error}</p> : null}
      </form>

      <p className="mt-3 text-xs text-ink-faint">
        We&rsquo;ll email a link they can use to accept. You can also copy and share the
        link directly.
      </p>

      <ul className="mt-6 divide-y divide-border rounded-md border border-border bg-panel">
        {invites.length === 0 ? (
          <li className="p-4 text-sm text-ink-muted">No pending invites.</li>
        ) : null}
        {invites.map((i) => {
          const url =
            createdLinks[i.id] ||
            (typeof window !== "undefined"
              ? `${window.location.origin}/api/invite/${i.token}`
              : "");
          return (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="text-sm">{i.email}</div>
                <div className="text-xs text-ink-faint">
                  {i.role} · expires {new Date(i.expires_at).toLocaleDateString()}
                </div>
                <div className="mt-1 truncate font-num text-[11px] text-ink-faint">{url}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(url, i.id)}
                  className="rounded border border-border bg-panel-muted p-2 hover:bg-panel"
                  title="Copy link"
                >
                  {copied === i.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => revoke(i.id)}
                  className="rounded border border-border bg-panel-muted p-2 text-measure hover:bg-panel"
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
  );
}
