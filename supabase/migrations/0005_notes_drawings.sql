-- ============================================================
-- Note styling + multi-drawing layers per page
-- ============================================================

-- Add a JSONB style column to notes for font/colour/weight customisation.
alter table public.notes add column if not exists style jsonb default '{}'::jsonb;

-- ------------------------------------------------------------
-- page_drawings: multiple imported drawings per page (PNG/PDF/DWG/etc.)
-- The legacy pages.source_storage_path remains as the implicit primary
-- drawing; new uploads beyond the first go into this table as additional
-- toggleable layers.
-- ------------------------------------------------------------
create table public.page_drawings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  storage_path text not null,
  file_type file_type,
  file_name text,
  file_size bigint,
  bounds jsonb,
  -- placement / transform within the page
  x numeric not null default 0,
  y numeric not null default 0,
  rotation numeric not null default 0,
  scale numeric not null default 1,
  visible boolean not null default true,
  sort_order int not null default 0,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz default now()
);

create index on public.page_drawings(page_id);

alter table public.page_drawings enable row level security;

create policy "page_drawings read" on public.page_drawings for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "page_drawings write" on public.page_drawings for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));
