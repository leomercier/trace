import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewOrgForm } from "./NewOrgForm";

export const dynamic = "force-dynamic";

export default async function NewOrgPage() {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/app" className="font-serif text-2xl">
          trace
        </Link>
      </header>
      <div className="mx-auto max-w-md px-6 pt-12">
        <h1 className="font-serif text-4xl">Create a workspace</h1>
        <p className="mt-2 text-ink-muted">
          A workspace holds projects and members. You can have more than one.
        </p>
        <div className="mt-8">
          <NewOrgForm />
        </div>
      </div>
    </main>
  );
}
