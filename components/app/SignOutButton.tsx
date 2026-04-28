"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="text-sm text-ink-muted hover:text-ink"
    >
      Sign out
    </button>
  );
}
