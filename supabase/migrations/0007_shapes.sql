-- ============================================================
-- Free-form shapes (line, rect, text) on a page
-- ============================================================

create type shape_kind as enum ('line', 'rect', 'text');

create table public.shapes (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  kind shape_kind not null,
  -- Geometry: for line, (x,y) is start and (x+w, y+h) is end (deltas).
  -- For rect / text, (x,y) is the top-left and (w,h) is the size.
  x numeric not null,
  y numeric not null,
  w numeric not null,
  h numeric not null,
  rotation numeric not null default 0,
  -- Visual
  stroke text default '#1c1917',
  stroke_width numeric default 2,
  stroke_opacity numeric default 1,
  fill text,                              -- null = no fill
  fill_opacity numeric default 1,
  -- Text-only payload
  text text,
  style jsonb default '{}'::jsonb,        -- {font, size, bold, italic, color, align}
  z_order int not null default 0,
  locked boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.shapes(page_id);

create trigger tg_shapes_touch before update on public.shapes
  for each row execute function public.touch_updated_at();

alter table public.shapes enable row level security;

create policy "shapes read" on public.shapes for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "shapes write" on public.shapes for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));
