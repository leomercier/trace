-- ============================================================
-- RLS for Trace
-- ============================================================

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.organisation_invites enable row level security;
alter table public.projects enable row level security;
alter table public.pages enable row level security;
alter table public.measurements enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;
alter table public.public_shares enable row level security;

-- ----------------------------------------------------------------
-- Helpers (security definer to bypass RLS while we evaluate)
-- ----------------------------------------------------------------

create or replace function public.is_org_member(org_id uuid, min_role org_role default 'viewer')
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.organisation_members
    where organisation_id = org_id
      and user_id = auth.uid()
      and (
        case min_role
          when 'viewer' then true
          when 'editor' then role in ('editor','admin','owner')
          when 'admin'  then role in ('admin','owner')
          when 'owner'  then role = 'owner'
        end
      )
  )
$$;

create or replace function public.org_id_of_project(p_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select organisation_id from public.projects where id = p_id
$$;

create or replace function public.org_id_of_page(p_id uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select pr.organisation_id
  from public.pages p
  join public.projects pr on pr.id = p.project_id
  where p.id = p_id
$$;

create or replace function public.can_access_page(p_id uuid, min_role org_role default 'viewer')
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_org_member(public.org_id_of_page(p_id), min_role)
$$;

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------

create policy "profiles read all" on public.profiles for select using (true);
create policy "profiles update self" on public.profiles for update using (id = auth.uid());

-- ----------------------------------------------------------------
-- organisations
-- ----------------------------------------------------------------

create policy "orgs read members" on public.organisations for select
  using (public.is_org_member(id, 'viewer'));
create policy "orgs insert any auth" on public.organisations for insert
  with check (created_by = auth.uid());
create policy "orgs update admin" on public.organisations for update
  using (public.is_org_member(id, 'admin'));
create policy "orgs delete owner" on public.organisations for delete
  using (public.is_org_member(id, 'owner'));

-- ----------------------------------------------------------------
-- organisation_members
-- ----------------------------------------------------------------

-- A member can see their own row (so they can list orgs they belong to).
create policy "members read self" on public.organisation_members for select
  using (user_id = auth.uid());
-- Members of the same org can see each other.
create policy "members read same org" on public.organisation_members for select
  using (public.is_org_member(organisation_id, 'viewer'));

-- The very first insert (creating org → adding self as owner) needs to work.
-- We allow inserts if the inserting user is becoming a member themselves OR is already an admin.
create policy "members insert self or admin" on public.organisation_members for insert
  with check (
    user_id = auth.uid()
    or public.is_org_member(organisation_id, 'admin')
  );
create policy "members update admin" on public.organisation_members for update
  using (public.is_org_member(organisation_id, 'admin'));
create policy "members delete admin or self" on public.organisation_members for delete
  using (
    user_id = auth.uid()
    or public.is_org_member(organisation_id, 'admin')
  );

-- ----------------------------------------------------------------
-- organisation_invites
-- ----------------------------------------------------------------

create policy "invites read admin" on public.organisation_invites for select
  using (public.is_org_member(organisation_id, 'admin'));
create policy "invites write admin" on public.organisation_invites for all
  using (public.is_org_member(organisation_id, 'admin'))
  with check (public.is_org_member(organisation_id, 'admin'));

-- ----------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------

create policy "projects read viewer" on public.projects for select
  using (public.is_org_member(organisation_id, 'viewer'));
create policy "projects insert editor" on public.projects for insert
  with check (public.is_org_member(organisation_id, 'editor'));
create policy "projects update editor" on public.projects for update
  using (public.is_org_member(organisation_id, 'editor'));
create policy "projects delete admin" on public.projects for delete
  using (public.is_org_member(organisation_id, 'admin'));

-- ----------------------------------------------------------------
-- pages
-- ----------------------------------------------------------------

create policy "pages read" on public.pages for select using (
  public.is_org_member(public.org_id_of_project(project_id), 'viewer')
);
create policy "pages write" on public.pages for all
  using (public.is_org_member(public.org_id_of_project(project_id), 'editor'))
  with check (public.is_org_member(public.org_id_of_project(project_id), 'editor'));

-- ----------------------------------------------------------------
-- measurements / notes / attachments
-- ----------------------------------------------------------------

create policy "measurements read" on public.measurements for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "measurements write" on public.measurements for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));

create policy "notes read" on public.notes for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "notes write" on public.notes for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));

create policy "attachments read" on public.attachments for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "attachments write" on public.attachments for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));

-- ----------------------------------------------------------------
-- public_shares
-- ----------------------------------------------------------------

create policy "shares read members" on public.public_shares for select using (
  (project_id is not null and public.is_org_member(public.org_id_of_project(project_id), 'viewer'))
  or
  (page_id is not null and public.can_access_page(page_id, 'viewer'))
);
create policy "shares write admin" on public.public_shares for all using (
  (project_id is not null and public.is_org_member(public.org_id_of_project(project_id), 'admin'))
  or
  (page_id is not null and public.is_org_member(public.org_id_of_page(page_id), 'admin'))
) with check (
  (project_id is not null and public.is_org_member(public.org_id_of_project(project_id), 'admin'))
  or
  (page_id is not null and public.is_org_member(public.org_id_of_page(page_id), 'admin'))
);
