-- ------------------------------------------------------------
-- 0010 — Lockable drawing layers
--
-- The editor lets the user move, resize and rotate each imported drawing.
-- A locked layer stays where it is until unlocked: the canvas refuses
-- drag / handle interactions on it and the panel hides the delete button.
-- ------------------------------------------------------------

alter table public.page_drawings
  add column if not exists locked boolean not null default false;
