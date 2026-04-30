-- ============================================================
-- Frames (a.k.a. "canvases") — bounded rectangles on a page that
-- act as artboards. Items can sit inside them spatially; the frame
-- itself is the export region when selected.
-- ============================================================

create table public.frames (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  name text not null default 'Canvas',
  -- Top-left in world coords + size. Free-floating; no rotation.
  x numeric not null,
  y numeric not null,
  w numeric not null,
  h numeric not null,
  background text default '#ffffff',
  z_order int not null default 0,
  locked boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.frames(page_id);

create trigger tg_frames_touch before update on public.frames
  for each row execute function public.touch_updated_at();

alter table public.frames enable row level security;

create policy "frames read" on public.frames for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "frames write" on public.frames for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));
