-- ============================================================
-- Trace v1 schema
-- ============================================================

-- Enable required extensions
create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- ============================================================
-- ORGS
-- ============================================================

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create type org_role as enum ('owner','admin','editor','viewer');

create table public.organisation_members (
  organisation_id uuid references public.organisations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role org_role not null default 'editor',
  invited_by uuid references public.profiles(id),
  joined_at timestamptz default now(),
  primary key (organisation_id, user_id)
);

create index on public.organisation_members(user_id);

create table public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  email text not null,
  role org_role not null default 'editor',
  token text unique not null,
  invited_by uuid references public.profiles(id),
  expires_at timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

create index on public.organisation_invites(organisation_id);
create index on public.organisation_invites(token);

-- ============================================================
-- PROJECTS
-- ============================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.projects(organisation_id);

-- ============================================================
-- PAGES
-- ============================================================

create type file_type as enum ('dwg','dxf','pdf','svg','png','jpg','other');

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  source_storage_path text,
  source_file_type file_type,
  source_file_name text,
  source_file_size bigint,
  source_bounds jsonb,
  thumbnail_path text,
  scale_real_per_unit numeric,
  scale_unit text default 'mm',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.pages(project_id);

-- ============================================================
-- ANNOTATIONS
-- ============================================================

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  ax numeric not null,
  ay numeric not null,
  bx numeric not null,
  by numeric not null,
  label text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.measurements(page_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  x numeric not null,
  y numeric not null,
  w numeric not null default 200,
  h numeric not null default 100,
  text text default '',
  color text default '#fef3c7',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.notes(page_id);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text,
  pinned_x numeric,
  pinned_y numeric,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz default now()
);

create index on public.attachments(page_id);

-- ============================================================
-- PUBLIC SHARING
-- ============================================================

create type share_scope as enum ('project','page');

create table public.public_shares (
  id uuid primary key default gen_random_uuid(),
  scope share_scope not null,
  project_id uuid references public.projects(id) on delete cascade,
  page_id uuid references public.pages(id) on delete cascade,
  slug text unique not null,
  password_hash text,
  allow_comments boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  expires_at timestamptz,
  check (
    (scope = 'project' and project_id is not null and page_id is null)
    or (scope = 'page' and page_id is not null and project_id is null)
  )
);

create index on public.public_shares(slug);

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger tg_projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger tg_pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();
create trigger tg_measurements_touch before update on public.measurements
  for each row execute function public.touch_updated_at();
create trigger tg_notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
