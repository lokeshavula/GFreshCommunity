-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

-- 1) Admin flag on community users
alter table public.gfm_users
  add column if not exists is_admin boolean not null default false;

-- Create your first admin (change mobile + password):
-- update public.gfm_users set is_admin = true where mobile_number = '9876543210';

-- 2) Price on categories
alter table public.categories
  add column if not exists price numeric(10, 2);

-- 3) Allow writes on categories (anon key app — tighten in production)
drop policy if exists "Public insert categories" on public.categories;
create policy "Public insert categories"
  on public.categories for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public update categories" on public.categories;
create policy "Public update categories"
  on public.categories for update
  to anon, authenticated
  using (true)
  with check (true);

grant insert, update on public.categories to anon, authenticated;

-- 4) Storage bucket for category images
insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read category images" on storage.objects;
create policy "Public read category images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'category-images');

drop policy if exists "Public upload category images" on storage.objects;
create policy "Public upload category images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'category-images');

drop policy if exists "Public update category images" on storage.objects;
create policy "Public update category images"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'category-images');

notify pgrst, 'reload schema';
