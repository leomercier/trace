"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NewClient() {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"signing-in" | "creating" | "redirecting">(
    "signing-in",
  );
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      // 1) Make sure we have a session. Re-use an existing one (logged in
      //    user OR previous anon session in this browser); otherwise sign
      //    in anonymously.
      const { data: existing } = await supabase.auth.getUser();
      if (!existing.user) {
        setStage("signing-in");
        const { error: signErr } = await supabase.auth.signInAnonymously();
        if (signErr) {
          setError(
            `Couldn't start a quick session: ${signErr.message}. ` +
              "If your project has anonymous sign-ins disabled, enable it in " +
              "Supabase → Authentication → Providers → Anonymous Sign-Ins.",
          );
          return;
        }
      }

      // 2) Create the workspace.
      setStage("creating");
      const res = await fetch("/api/orgs/create-anon", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Couldn't create the workspace.");
        return;
      }

      // 3) Send them to the editor for the freshly-created page.
      setStage("redirecting");
      router.replace(
        `/app/${json.org.slug}/${json.projectId}/${json.pageId}`,
      );
    })();
  }, [router, supabase]);

  return (
    <div className="mx-auto max-w-md px-6 pt-24">
      {error ? (
        <div className="rounded-md border border-border bg-panel p-6">
          <h1 className="font-serif text-2xl">Couldn&rsquo;t start your sandbox</h1>
          <p className="mt-2 text-sm text-measure">{error}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-md border border-border bg-panel-muted px-4 py-2 text-sm hover:bg-panel"
          >
            Back to home
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-ink-muted" />
          <h1 className="font-serif text-3xl">
            {stage === "signing-in" && "Starting your sandbox…"}
            {stage === "creating" && "Setting up the canvas…"}
            {stage === "redirecting" && "Almost there…"}
          </h1>
          <p className="max-w-sm text-sm text-ink-muted">
            No signup needed. Your workspace is yours for 7 days. Sign in any
            time to keep it forever.
          </p>
        </div>
      )}
    </div>
  );
}
