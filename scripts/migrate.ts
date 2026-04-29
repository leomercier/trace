/**
 * Apply pending Supabase migrations using the service-role key — no extra
 * env vars beyond what the app already needs.
 *
 * How it works:
 *   1) `supabase/bootstrap.sql` is run ONCE manually in Supabase Studio.
 *      That installs a SECURITY DEFINER function `public._trace_exec_sql`
 *      and a `public._trace_migrations` tracking table.
 *   2) On every Vercel deploy, `bun run vercel-build` runs this script.
 *      We connect with @supabase/supabase-js using the service-role JWT
 *      (which we already have for RLS-bypassing server routes), call the
 *      RPC for each new migration, and INSERT a row into _trace_migrations
 *      so we never run the same one twice.
 *   3) `supabase/seed.sql` runs at the end (idempotent).
 *
 * Required env (already used elsewhere by the app):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Failure modes:
 *   - Env vars missing  → warn, skip, exit 0.
 *   - Bootstrap RPC missing → tell the user to paste bootstrap.sql once,
 *     skip, exit 0 (so a fresh project's first deploy doesn't fail; the
 *     second deploy after bootstrap will succeed).
 *   - Migration SQL error → log + non-zero exit (this WILL fail the build,
 *     which is what we want).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const SEED_FILE = path.join(process.cwd(), "supabase", "seed.sql");
const BOOTSTRAP_HINT = "supabase/bootstrap.sql";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn(
      "[migrate] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must " +
        "both be set; skipping migrations.",
    );
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Are we bootstrapped?
  const ready = await ensureBootstrap(supabase);
  if (!ready) return; // already explained to the user; skip without erroring.

  // 2) Pull the list of already-applied migrations.
  const { data: rows, error: listErr } = await supabase
    .from("_trace_migrations")
    .select("name");
  if (listErr) {
    console.error("[migrate] failed to read _trace_migrations:", listErr.message);
    process.exit(1);
  }
  const applied = new Set<string>((rows || []).map((r: any) => r.name));

  // 3) Walk supabase/migrations/*.sql in order.
  let entries: string[];
  try {
    entries = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.warn("[migrate] no supabase/migrations directory; nothing to do");
      return;
    }
    throw err;
  }

  let appliedThisRun = 0;
  for (const name of entries) {
    if (applied.has(name)) continue;
    const body = await fs.readFile(path.join(MIGRATIONS_DIR, name), "utf8");
    console.log(`[migrate] applying ${name}…`);
    const execErr = await execSql(supabase, body);
    if (execErr) {
      console.error(`[migrate] FAILED on ${name}:`, execErr);
      process.exit(1);
    }
    const { error: trackErr } = await supabase
      .from("_trace_migrations")
      .insert({ name });
    if (trackErr) {
      console.error(
        `[migrate] applied ${name} but failed to record it:`,
        trackErr.message,
      );
      process.exit(1);
    }
    appliedThisRun++;
  }

  if (appliedThisRun === 0) {
    console.log("[migrate] no new migrations.");
  } else {
    console.log(`[migrate] applied ${appliedThisRun} migration(s).`);
  }

  // 4) Seed (idempotent).
  try {
    const seed = await fs.readFile(SEED_FILE, "utf8");
    if (seed.trim()) {
      console.log(`[migrate] running supabase/seed.sql…`);
      const seedErr = await execSql(supabase, seed);
      if (seedErr) {
        console.error("[migrate] seed failed:", seedErr);
        process.exit(1);
      }
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
}

async function execSql(supabase: SupabaseClient, sql: string): Promise<string | null> {
  const { error } = await supabase.rpc("_trace_exec_sql", { sql });
  return error ? error.message : null;
}

async function ensureBootstrap(supabase: SupabaseClient): Promise<boolean> {
  // Probe the RPC with a no-op. If the function doesn't exist, PostgREST
  // returns a clear "Could not find the function" error.
  const { error } = await supabase.rpc("_trace_exec_sql", { sql: "select 1" });
  if (!error) return true;

  const looksMissing =
    /could not find.*function|does not exist|PGRST202/i.test(
      [(error as any).message, (error as any).hint, (error as any).code]
        .filter(Boolean)
        .join(" "),
    );

  if (looksMissing) {
    console.warn(
      "[migrate] One-time bootstrap is required.\n" +
        `         Open Supabase Studio → SQL Editor → New query, paste\n` +
        `         the contents of ${BOOTSTRAP_HINT}, and Run. Then redeploy.\n` +
        `         (This is a one-time step. Subsequent deploys are automatic.)`,
    );
    return false;
  }

  console.error("[migrate] failed to call _trace_exec_sql:", error.message);
  process.exit(1);
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
