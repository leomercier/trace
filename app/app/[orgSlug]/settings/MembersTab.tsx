"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import type { OrgRole } from "@/lib/supabase/types";

interface Row {
  user_id: string;
  role: OrgRole;
  email: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

const ROLES: OrgRole[] = ["owner", "admin", "editor", "viewer"];

export function MembersTab({
  orgId,
  currentUserId,
  currentRole,
  members,
}: {
  orgId: string;
  currentUserId: string;
  currentRole: OrgRole;
  members: Row[];
}) {
  const router = useRouter();

  async function changeRole(userId: string, role: OrgRole) {
    await fetch(`/api/members/${orgId}/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  async function remove(userId: string) {
    if (!confirm("Remove this member?")) return;
    await fetch(`/api/members/${orgId}/${userId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <ul className="divide-y divide-trace-black/10 rounded-md border border-trace-black/15 bg-trace-white">
      {members.map((m) => {
        const isSelf = m.user_id === currentUserId;
        const canEdit =
          (currentRole === "owner" || currentRole === "admin") &&
          !isSelf &&
          m.role !== "owner";
        return (
          <li
            key={m.user_id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={m.display_name} src={m.avatar_url} size={36} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-trace-black">
                  {m.display_name}
                  {isSelf ? (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-trace-black/50">
                      You
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-trace-black/60">
                  {m.email}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canEdit ? (
                <select
                  value={m.role}
                  onChange={(e) =>
                    changeRole(m.user_id, e.target.value as OrgRole)
                  }
                  className="h-9 rounded-md border border-trace-black/20 bg-trace-white px-2 text-sm text-trace-black hover:border-trace-black focus:border-trace-black focus:outline-none"
                >
                  {ROLES.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
                    m.role === "owner"
                      ? "border-trace-violet/30 bg-trace-violet/10 text-trace-violet"
                      : "border-trace-black/15 bg-trace-black/5 text-trace-black/70"
                  }`}
                >
                  {m.role}
                </span>
              )}
              {canEdit ? (
                <button
                  onClick={() => remove(m.user_id)}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-trace-error hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
