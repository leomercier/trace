-- ============================================================
-- Storage buckets + policies
-- Run after the auth/RLS migrations.
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('drawings',    'drawings',    false),
  ('attachments', 'attachments', false),
  ('thumbnails',  'thumbnails',  true),
  ('avatars',     'avatars',     true)
on conflict (id) do nothing;

-- Helper: the path convention is {org_id}/{project_id}/{page_id}/...
-- For now we keep policies simple: any authenticated org-member that owns
-- the org_id (the first segment) can read/write. Tighten later if needed.

create or replace function public.path_org_id(name text)
returns uuid language sql immutable as $$
  select case
    when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
      then split_part(name, '/', 1)::uuid
    else null
  end
$$;

-- drawings + attachments (private)
create policy "drawings read members"
  on storage.objects for select
  using (
    bucket_id = 'drawings'
    and public.is_org_member(public.path_org_id(name), 'viewer')
  );
create policy "drawings write editors"
  on storage.objects for insert
  with check (
    bucket_id = 'drawings'
    and public.is_org_member(public.path_org_id(name), 'editor')
  );
create policy "drawings update editors"
  on storage.objects for update
  using (
    bucket_id = 'drawings'
    and public.is_org_member(public.path_org_id(name), 'editor')
  );
create policy "drawings delete editors"
  on storage.objects for delete
  using (
    bucket_id = 'drawings'
    and public.is_org_member(public.path_org_id(name), 'editor')
  );

create policy "attachments read members"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and public.is_org_member(public.path_org_id(name), 'viewer')
  );
create policy "attachments write editors"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and public.is_org_member(public.path_org_id(name), 'editor')
  );
create policy "attachments delete editors"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and public.is_org_member(public.path_org_id(name), 'editor')
  );

-- thumbnails + avatars (public buckets — read open, write authenticated)
create policy "thumbnails read public"
  on storage.objects for select using (bucket_id = 'thumbnails');
create policy "thumbnails write auth"
  on storage.objects for insert with check (bucket_id = 'thumbnails' and auth.uid() is not null);

create policy "avatars read public"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars write self"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '/', 1));
create policy "avatars update self"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '/', 1));
