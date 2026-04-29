-- ============================================================
-- Anonymous workspaces — disposable test/demo workspaces with a 7-day TTL.
-- Anyone hitting /new gets a Supabase anonymous session and a brand-new
-- org. The org is flagged is_anonymous and given expires_at = now() + 7d.
-- A daily cleanup deletes expired anon orgs (cascade removes everything
-- under them).
-- ============================================================

alter table public.organisations
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists expires_at timestamptz;

create index if not exists organisations_anon_expiry_idx
  on public.organisations(expires_at)
  where is_anonymous = true;

-- Cleanup function: deletes expired anonymous orgs. Cascades to projects,
-- pages, measurements, notes, shapes, placed_items, etc. Safe to call as
-- often as you like.
create or replace function public.cleanup_anonymous_orgs()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  delete from public.organisations
  where is_anonymous = true
    and expires_at is not null
    and expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end
$$;

revoke all on function public.cleanup_anonymous_orgs() from public;
revoke all on function public.cleanup_anonymous_orgs() from anon;
revoke all on function public.cleanup_anonymous_orgs() from authenticated;
grant execute on function public.cleanup_anonymous_orgs() to service_role;

-- Helper exposed to the editor so the UI can show a friendly "expires in
-- N days" badge for anon workspaces.
create or replace function public.org_expiry(org_id uuid)
returns timestamptz
language sql
security definer
stable
set search_path = public
as $$
  select expires_at from public.organisations
  where id = org_id and is_anonymous = true
$$;
