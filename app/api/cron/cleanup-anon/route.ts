import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Daily cleanup of expired anonymous workspaces.
 *
 * Triggered by Vercel Cron via vercel.json. Runs the
 * `cleanup_anonymous_orgs()` Postgres function (SECURITY DEFINER, service-
 * role only) which deletes anon orgs whose expires_at is in the past;
 * cascades nuke projects, pages, and all per-page rows.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer <CRON_SECRET>`. We accept
 * either that or the service-role key (so a human can also kick the job
 * manually with curl).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ok =
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    (serviceKey && auth === `Bearer ${serviceKey}`);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const svc = createServiceClient();
  const { data, error } = await svc.rpc("cleanup_anonymous_orgs");
  if (error) {
    console.error("[cron/cleanup-anon]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const removed = (data as any) ?? 0;
  return NextResponse.json({ removed });
}
