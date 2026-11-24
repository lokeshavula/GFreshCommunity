-- Fix public.categories API + schema cache
-- Run ALL of this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create extension if not exists "pgcrypto";

-- 1) Create categories table if missing
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  section_id text not null,
  section_title text not null,
  image_url text,
  price numeric(10, 2),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) Add price column if table existed without it
alter table public.categories
  add column if not exists price numeric(10, 2);

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade;

create index if not exists categories_parent_id_idx on public.categories (parent_id);

-- 3) RLS + policies
alter table public.categories enable row level security;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

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

-- 4) API permissions for anon/authenticated roles
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.categories to anon, authenticated;

-- 5) Optional seed (skip if you already have rows)
insert into public.categories (slug, name, section_id, section_title, image_url, sort_order) values
  ('vegetables', 'Vegetables', 'grocery', 'Grocery & Kitchen', 'califower.png', 1),
  ('fruits', 'Fresh Fruits', 'grocery', 'Grocery & Kitchen', 'fruits.png', 2),
  ('drinks', 'Drinks & Juices', 'snacks', 'Snacks & Drinks', 'drinks.png', 1)
on conflict (slug) do nothing;

-- 6) Reload PostgREST schema cache (IMPORTANT)
notify pgrst, 'reload schema';

-- 7) Verify table is visible
select id, slug, name, price, section_title
from public.categories
order by sort_order
limit 10;
