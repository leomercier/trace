-- ============================================================
-- Lock flag on placed items
-- ============================================================
alter table public.placed_items
  add column if not exists locked boolean not null default false;
