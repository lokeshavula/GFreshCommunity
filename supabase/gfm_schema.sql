-- Run this in Supabase → SQL Editor → New query
-- Dashboard: https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create table if not exists public.gfm_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile_number text not null unique,
  block_number text not null,
  flat_no text not null,
  password text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.gfm_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  user_id text not null,
  customer_name text not null,
  mobile_number text not null,
  block_number text not null,
  flat_no text not null,
  items jsonb not null default '[]'::jsonb,
  delivery_slot text not null,
  delivery_time text not null,
  instructions text not null default '',
  ordered_at timestamptz not null default now(),
  status text not null default 'placed',
  status_updated_at timestamptz not null default now()
);

-- If table already exists, run supabase/migration_status.sql instead (includes schema reload)

create index if not exists gfm_orders_ordered_at_idx on public.gfm_orders (ordered_at desc);

alter table public.gfm_users enable row level security;
alter table public.gfm_orders enable row level security;

drop policy if exists "gfm_users_all" on public.gfm_users;
create policy "gfm_users_all" on public.gfm_users for all using (true) with check (true);

drop policy if exists "gfm_orders_all" on public.gfm_orders;
create policy "gfm_orders_all" on public.gfm_orders for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_users to anon, authenticated;
grant select, insert, update, delete on public.gfm_orders to anon, authenticated;

notify pgrst, 'reload schema';
