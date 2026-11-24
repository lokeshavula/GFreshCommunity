-- Fix: "Storage bucket missing" when uploading category images
-- Run ALL of this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

-- 1) Create public bucket for category images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images',
  'category-images',
  true,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Allow app to read uploaded images
drop policy if exists "Public read category images" on storage.objects;
create policy "Public read category images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'category-images');

-- 3) Allow app to upload images
drop policy if exists "Public upload category images" on storage.objects;
create policy "Public upload category images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'category-images');

-- 4) Allow overwrite/update (optional)
drop policy if exists "Public update category images" on storage.objects;
create policy "Public update category images"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'category-images');

-- 5) Verify bucket exists
select id, name, public, created_at
from storage.buckets
where id = 'category-images';
