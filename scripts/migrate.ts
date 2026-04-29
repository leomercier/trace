/**
 * Apply pending Supabase migrations.
 *
 * Wired into Vercel via the `vercel-build` npm script (see package.json).
 * Vercel runs `vercel-build` automatically when present, falling back to
 * `build` otherwise. So every deploy:
 *
 *   1) `bun run migrate`  ← this file: brings the DB up to date
 *   2) `next build`       ← compile the app
 *
 * If `SUPABASE_DB_URL` is missing we warn and exit 0, so a misconfigured
 * preview deploy doesn't fail the build — the app still loads but the
 * latest migrations aren't applied. Set the env var in Vercel project
 * settings (mark it sensitive).
 *
 * Locally: `bun run migrate` works the same, just point at your Supabase
 * project's direct DB URL or the session-mode pooler.
 */

import postgres from "postgres";
import fs from "node:fs/promises";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const SEED_FILE = path.join(process.cwd(), "supabase", "seed.sql");
const TRACK_TABLE = "_trace_migrations";

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.warn(
      "[migrate] SUPABASE_DB_URL is not set; skipping. Set it in Vercel " +
        "project settings to apply migrations on deploy.",
    );
    return;
  }

  const sql = postgres(dbUrl, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 30,
    // Supabase requires SSL. The "?sslmode=require" suffix on the URL also
    // works; this is a safe default if the URL doesn't include it.
    ssl: "require",
    onnotice: () => {},
  });

  try {
    await sql.unsafe(
      `create table if not exists public.${TRACK_TABLE} (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );

    const applied = new Set<string>(
      (await sql<{ name: string }[]>`select name from ${sql(`public.${TRACK_TABLE}`)}`).map(
        (r) => r.name,
      ),
    );

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
      const fullPath = path.join(MIGRATIONS_DIR, name);
      const body = await fs.readFile(fullPath, "utf8");
      console.log(`[migrate] applying ${name}…`);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx.unsafe(
          `insert into public.${TRACK_TABLE} (name) values ($1)`,
          [name],
        );
      });
      appliedThisRun++;
    }
    if (appliedThisRun === 0) {
      console.log("[migrate] no new migrations.");
    } else {
      console.log(`[migrate] applied ${appliedThisRun} migration(s).`);
    }

    // Seed file (idempotent — its first statement clears default rows).
    try {
      const seed = await fs.readFile(SEED_FILE, "utf8");
      console.log(`[migrate] running supabase/seed.sql…`);
      await sql.unsafe(seed);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
