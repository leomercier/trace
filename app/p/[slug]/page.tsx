import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyShareToken } from "@/lib/utils/password";
import { ShareGate } from "./ShareGate";
import { ShareViewer } from "./ShareViewer";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Generate the share-card metadata so anyone pasting a /p/{slug} URL into
 * Slack / iMessage / WhatsApp / Twitter sees a proper preview with the
 * project / page name and a generated cover image. The image itself is
 * served by the sibling opengraph-image.tsx route.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const svc = createServiceClient();
  const { data: share } = await svc
    .from("public_shares")
    .select("scope, project_id, page_id")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!share) {
    return { title: "tracable — shared workspace" };
  }
  let title = "tracable — shared workspace";
  let description = "Open-source design and prototyping. Anyone with this link can collaborate.";
  if (share.scope === "page" && share.page_id) {
    const { data: page } = await svc
      .from("pages")
      .select("name, projects:project_id (name)")
      .eq("id", share.page_id)
      .maybeSingle();
    const pageName = page?.name || "Untitled page";
    const projectName = (page as any)?.projects?.name || "tracable";
    title = `${pageName} · ${projectName}`;
    description = `Shared on tracable · ${projectName}`;
  } else if (share.scope === "project" && share.project_id) {
    const { data: project } = await svc
      .from("projects")
      .select("name, description")
      .eq("id", share.project_id)
      .maybeSingle();
    title = project?.name || title;
    description = project?.description || description;
  }
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          // Resolved by app/p/[slug]/opengraph-image.tsx at request time.
          url: `/p/${params.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/p/${params.slug}/opengraph-image`],
    },
  };
}

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
            tracable
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
