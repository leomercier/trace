import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyShareToken } from "@/lib/utils/password";
import { ShareGate } from "./ShareGate";
import { ShareViewer } from "./ShareViewer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicSharePage({
  params,
}: {
  params: { slug: string };
}) {
  const svc = createServiceClient();
  const { data: share } = await svc
    .from("public_shares")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!share) notFound();

  let needsPassword = false;
  if (share.password_hash) {
    const tok = cookies().get(`trace_share_${params.slug}`)?.value;
    if (!verifyShareToken(params.slug, tok)) needsPassword = true;
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-serif text-xl">
            trace
          </Link>
          <span className="rounded bg-panel px-2 py-0.5 text-[11px] uppercase tracking-wider text-ink-muted">
            Shared link
          </span>
        </div>
      </header>
      {needsPassword ? (
        <ShareGate slug={params.slug} />
      ) : (
        <ShareViewer slug={params.slug} />
      )}
    </main>
  );
}
