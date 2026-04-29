import Link from "next/link";
import { JoinClient } from "./JoinClient";
import { TraceWordmark } from "@/components/marketing/TraceLogo";

export const metadata = { title: "Joining sandbox — tracable" };
export const dynamic = "force-dynamic";

export default function JoinSandboxPage({
  params,
  searchParams,
}: {
  params: { orgSlug: string };
  searchParams: { next?: string };
}) {
  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="tracable home">
          <TraceWordmark logoSize={22} />
        </Link>
      </header>
      <JoinClient orgSlug={params.orgSlug} next={searchParams.next || "/app"} />
    </main>
  );
}
