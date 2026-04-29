"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Public-link entry for an anonymous (sandbox) workspace. We sign the
 * visitor in anonymously if they don't have a session, look up the org's
 * id by slug via the public-share fallback path (the create-anon route
 * minted a public_shares row at creation, but we don't actually need it
 * here — the join-anon endpoint trusts the slug only on anonymous orgs).
 *
 * After joining we replace history with `next` so the browser back button
 * doesn't bounce them back here.
 */
export function JoinClient({ orgSlug, next }: { orgSlug: string; next: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"signing-in" | "joining" | "redirecting">(
    "signing-in",
  );
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const { data: existing } = await supabase.auth.getUser();
      if (!existing.user) {
        setStage("signing-in");
        const { error: signErr } = await supabase.auth.signInAnonymously();
        if (signErr) {
          setError(
            `Couldn't open the sandbox: ${signErr.message}. ` +
              "Anonymous sign-ins are disabled on this Supabase project.",
          );
          return;
        }
      }

      // Look up org by slug via the join endpoint, which handles the
      // membership upsert. The endpoint takes an org_id, so we resolve the
      // slug → id first via the public anon-only RPC.
      setStage("joining");
      // Resolve the org id. For anon orgs, the public_shares row exposes
      // them via the share data route, but since we already have a session
      // we can just hit a tiny lookup. We POST to /api/orgs/join-anon-by-slug
      // (added below) which does the slug→id lookup AND the upsert in one
      // request — fewer round trips than a separate resolution step.
      const res = await fetch(`/api/orgs/join-anon-by-slug`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: orgSlug }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Couldn't join the sandbox.");
        return;
      }

      setStage("redirecting");
      router.replace(next);
    })();
  }, [orgSlug, next, router, supabase]);

  return (
    <div className="mx-auto max-w-md px-6 pt-24">
      {error ? (
        <div className="rounded-md border border-border bg-panel p-6">
          <h1 className="font-serif text-2xl">Couldn&rsquo;t open this sandbox</h1>
          <p className="mt-2 text-sm text-measure">{error}</p>
          <a
            href="/new"
            className="mt-6 inline-block rounded-md bg-ink px-4 py-2 text-sm text-white hover:bg-black/90"
          >
            Start a fresh one
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-ink-muted" />
          <h1 className="font-serif text-3xl">
            {stage === "signing-in" && "Opening the sandbox…"}
            {stage === "joining" && "Adding you as a collaborator…"}
            {stage === "redirecting" && "Almost there…"}
          </h1>
          <p className="max-w-sm text-sm text-ink-muted">
            Anyone with this link can collaborate. Sign in any time to keep your
            edits.
          </p>
        </div>
      )}
    </div>
  );
}
