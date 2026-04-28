-- ============================================================
-- Inventory (default + AI-sourced) and placed items
-- ============================================================

create type item_source as enum ('default','ai','manual');

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  -- null organisation_id = global default item visible to all auth users
  organisation_id uuid references public.organisations(id) on delete cascade,
  source item_source not null default 'manual',
  name text not null,
  category text,                          -- Living, Kitchen, Bedroom, Bathroom, Doors
  brand text,
  price_text text,
  width_mm int not null,
  depth_mm int not null,
  height_mm int not null,
  svg_markup text not null,
  thumbnail_url text,
  source_url text,
  query text,                             -- original AI search query for cache lookups
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index on public.inventory_items(organisation_id);
create index on public.inventory_items(category);
create index on public.inventory_items(query) where source = 'ai';

-- Items placed on a page
create table public.placed_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  -- snapshot of definition at placement time so resizing doesn't break later
  name text not null,
  brand text,
  svg_markup text not null,
  width_mm int not null,
  depth_mm int not null,
  height_mm int not null,
  -- positioning in drawing-world coords
  x numeric not null,
  y numeric not null,
  rotation numeric default 0,             -- degrees, clockwise
  scale_w numeric default 1,
  scale_d numeric default 1,
  z_order int default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.placed_items(page_id);

-- Recently used items per org
create table public.recent_items (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  used_at timestamptz default now(),
  primary key (organisation_id, inventory_item_id)
);

-- Threaded speech-bubble comments (different from sticky notes)
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  x numeric not null,
  y numeric not null,
  text text not null default '',
  resolved boolean default false,
  author_id uuid references public.profiles(id),
  author_name text,                       -- denormalised for guest comments on public links
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.comments(page_id);
create index on public.comments(parent_id);

-- AI usage log
create table public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  endpoint text not null,                 -- 'product-search' | 'canvas-chat'
  input_tokens int,
  output_tokens int,
  cache_hit boolean default false,
  cost_estimate_cents int,
  created_at timestamptz default now()
);

create index on public.ai_calls(organisation_id, created_at);

-- Triggers
create trigger tg_placed_items_touch before update on public.placed_items
  for each row execute function public.touch_updated_at();
create trigger tg_comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();

-- Bump recent_items on placement
create or replace function public.bump_recent_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare org_id uuid;
begin
  if new.inventory_item_id is not null then
    select pr.organisation_id into org_id
      from public.pages p
      join public.projects pr on pr.id = p.project_id
      where p.id = new.page_id;
    if org_id is not null then
      insert into public.recent_items (organisation_id, inventory_item_id, used_at)
        values (org_id, new.inventory_item_id, now())
        on conflict (organisation_id, inventory_item_id) do update set used_at = now();
    end if;
  end if;
  return new;
end $$;

create trigger tg_bump_recent
  after insert on public.placed_items
  for each row execute function public.bump_recent_item();

-- ============================================================
-- RLS
-- ============================================================

alter table public.inventory_items enable row level security;
alter table public.placed_items enable row level security;
alter table public.recent_items enable row level security;
alter table public.comments enable row level security;
alter table public.ai_calls enable row level security;

-- inventory: defaults visible to all authed users; org items to org members
create policy "inventory read defaults or org" on public.inventory_items for select
  using (
    organisation_id is null
    or public.is_org_member(organisation_id, 'viewer')
  );
create policy "inventory write org editor" on public.inventory_items for all
  using (organisation_id is not null and public.is_org_member(organisation_id, 'editor'))
  with check (organisation_id is not null and public.is_org_member(organisation_id, 'editor'));

-- placed_items
create policy "placed_items read" on public.placed_items for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "placed_items write" on public.placed_items for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));

-- recent_items
create policy "recent read" on public.recent_items for select
  using (public.is_org_member(organisation_id, 'viewer'));
create policy "recent write" on public.recent_items for all
  using (public.is_org_member(organisation_id, 'editor'))
  with check (public.is_org_member(organisation_id, 'editor'));

-- comments — anyone with page access (viewer+) can read; editors+ can write
-- (public-share comment writes happen via service-role route)
create policy "comments read" on public.comments for select
  using (public.can_access_page(page_id, 'viewer'));
create policy "comments write" on public.comments for all
  using (public.can_access_page(page_id, 'editor'))
  with check (public.can_access_page(page_id, 'editor'));

-- ai_calls — admins of the org can see usage; writes via service role
create policy "ai_calls read admin" on public.ai_calls for select
  using (public.is_org_member(organisation_id, 'admin'));
