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
    <div>
      <form
        onSubmit={onInvite}
        className="grid gap-3 rounded-md border border-trace-black/15 bg-trace-white p-4 md:grid-cols-[1fr_140px_auto]"
      >
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
            className="h-10 w-full rounded-md border border-trace-black/20 bg-trace-white px-3 text-sm text-trace-black hover:border-trace-black focus:border-trace-black focus:outline-none"
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
        {error ? (
          <p className="text-sm text-trace-error md:col-span-3">{error}</p>
        ) : null}
      </form>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-trace-black/50">
        Email + copyable link · accept_url is single-use
      </p>

      <ul className="mt-6 divide-y divide-trace-black/10 rounded-md border border-trace-black/15 bg-trace-white">
        {invites.length === 0 ? (
          <li className="p-6 text-sm text-trace-black/60">
            No pending invites.
          </li>
        ) : null}
        {invites.map((i) => {
          const url =
            createdLinks[i.id] ||
            (typeof window !== "undefined"
              ? `${window.location.origin}/api/invite/${i.token}`
              : "");
          return (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-trace-black">
                  {i.email}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-trace-black/60">
                  <span className="rounded-full border border-trace-black/15 bg-trace-black/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">
                    {i.role}
                  </span>
                  <span>
                    Expires {new Date(i.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-trace-black/50">
                  {url}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(url, i.id)}
                  className="rounded-md border border-trace-black/15 bg-trace-white p-2 text-trace-black hover:border-trace-black"
                  title="Copy link"
                >
                  {copied === i.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => revoke(i.id)}
                  className="rounded-md border border-trace-black/15 bg-trace-white p-2 text-trace-error hover:border-trace-error"
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
