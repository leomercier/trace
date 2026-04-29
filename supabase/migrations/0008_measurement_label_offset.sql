-- ============================================================
-- Draggable measurement labels: store offset from midpoint in WORLD units.
-- A non-zero offset draws a dotted leader line from midpoint to label.
-- ============================================================

alter table public.measurements
  add column if not exists label_dx numeric not null default 0,
  add column if not exists label_dy numeric not null default 0;
