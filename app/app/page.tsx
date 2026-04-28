import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/app/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: memberships } = await supabase
    .from("organisation_members")
    .select("role, organisations(id, name, slug)")
    .eq("user_id", u.user.id);

  const orgs = (memberships || [])
    .map((m: any) => ({ ...m.organisations, role: m.role }))
    .filter((o: any) => o && o.slug);

  if (orgs.length === 1) redirect(`/app/${orgs[0].slug}`);

  return (
    <main className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-serif text-2xl">
          trace
        </Link>
        <SignOutButton />
      </header>
      <section className="mx-auto max-w-5xl px-6 pt-12">
        <h1 className="font-serif text-4xl">Your workspaces</h1>
        {orgs.length === 0 ? (
          <div className="mt-10 rounded-md border border-border bg-panel p-6">
            <p className="text-ink-muted">
              You don&rsquo;t belong to any workspace yet.
            </p>
            <Link
              href="/new-org"
              className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-white hover:bg-black/90"
            >
              Create a workspace
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 grid gap-3">
              {orgs.map((o: any) => (
                <li key={o.id}>
                  <Link
                    href={`/app/${o.slug}`}
                    className="block rounded-md border border-border bg-panel p-5 hover:border-border-strong"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-serif text-xl">{o.name}</div>
                        <div className="text-xs text-ink-faint">{o.slug}</div>
                      </div>
                      <div className="text-xs uppercase tracking-wider text-ink-muted">
                        {o.role}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/new-org"
              className="mt-6 inline-block text-sm text-ink underline underline-offset-4 hover:no-underline"
            >
              + Create a new workspace
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
