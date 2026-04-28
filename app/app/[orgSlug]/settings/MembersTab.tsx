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
    <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-panel">
      {members.map((m) => {
        const isSelf = m.user_id === currentUserId;
        const canEdit = (currentRole === "owner" || currentRole === "admin") && !isSelf && m.role !== "owner";
        return (
          <li key={m.user_id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={m.display_name} src={m.avatar_url} size={36} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{m.display_name}</div>
                <div className="truncate text-xs text-ink-faint">{m.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canEdit ? (
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.user_id, e.target.value as OrgRole)}
                  className="h-9 rounded-md border border-border bg-panel px-2 text-sm"
                >
                  {ROLES.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs uppercase tracking-wider text-ink-muted">{m.role}</span>
              )}
              {canEdit ? (
                <button
                  onClick={() => remove(m.user_id)}
                  className="text-xs text-measure underline underline-offset-4 hover:no-underline"
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
