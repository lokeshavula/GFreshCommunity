-- Bulk Catalog & Group Buying Tables for G-Fresh Community
-- Run this in Supabase SQL Editor if you want database persistence for bulk availability:
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create table if not exists public.gfm_bulk_available_products (
  id uuid primary key default gen_random_uuid(),
  product_id text not null unique,
  name text not null,
  unit text not null default 'kg',
  retail_price numeric not null default 0,
  wholesale_price numeric not null default 0,
  min_bulk_qty numeric not null default 2,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gfm_group_buying_pools (
  id text primary key,
  title text not null,
  subtitle text default '',
  emoji text default '📦',
  unit text not null default 'pack',
  original_price numeric not null default 0,
  group_price numeric not null default 0,
  total_slots integer not null default 10,
  filled_slots integer not null default 0,
  min_order_qty integer not null default 1,
  max_order_qty integer not null default 5,
  status text not null default 'active',
  target_delivery_date text default 'Upcoming Delivery',
  closes_at_label text default 'Limited Slots',
  members jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gfm_bulk_available_products enable row level security;
alter table public.gfm_group_buying_pools enable row level security;

drop policy if exists "gfm_bulk_available_products_all" on public.gfm_bulk_available_products;
create policy "gfm_bulk_available_products_all" on public.gfm_bulk_available_products for all using (true) with check (true);

drop policy if exists "gfm_group_buying_pools_all" on public.gfm_group_buying_pools;
create policy "gfm_group_buying_pools_all" on public.gfm_group_buying_pools for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_bulk_available_products to anon, authenticated;
grant select, insert, update, delete on public.gfm_group_buying_pools to anon, authenticated;

notify pgrst, 'reload schema';
