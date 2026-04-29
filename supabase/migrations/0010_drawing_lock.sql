-- Lock flag for drawing layers, mirroring the placed_items lock added in
-- 0006. With drawings now movable on the canvas, users want a way to pin
-- the underlay so they don't accidentally drag the floor plan when
-- panning around it.

alter table public.page_drawings
  add column if not exists locked boolean not null default false;
