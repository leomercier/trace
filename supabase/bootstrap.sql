-- ============================================================
-- Trace migration bootstrap
-- ============================================================
--
-- One-time setup. Paste this whole file into Supabase Studio →
-- SQL Editor → "New query" → Run, on a brand-new project.
--
-- It installs a single SECURITY DEFINER function `public._trace_exec_sql`
-- that the service_role can call via PostgREST. After this is in place,
-- the deploy-time migration script (`scripts/migrate.ts`) uses the
-- service-role key you already have set up to apply every subsequent
-- migration automatically — no database password, no extra env vars.
--
-- The function is access-restricted: only the service_role JWT can
-- invoke it. anon/authenticated users cannot.

create or replace function public._trace_exec_sql(sql text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute sql;
end
$$;

-- Lock down the function — service_role only.
revoke all on function public._trace_exec_sql(text) from public;
revoke all on function public._trace_exec_sql(text) from anon;
revoke all on function public._trace_exec_sql(text) from authenticated;
grant execute on function public._trace_exec_sql(text) to service_role;

-- Tracking table for applied migrations.
create table if not exists public._trace_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table public._trace_migrations enable row level security;
-- service_role bypasses RLS so no policies are needed; reads from the
-- anon/authenticated keys are denied by default which is what we want.
