-- Copy ALL of this → Supabase SQL Editor → Run
-- Direct link:
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create table if not exists public.gfm_cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  product_id text not null,
  name text not null,
  subtitle text not null default '',
  price numeric not null,
  unit text not null default 'pack',
  image_url text,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists gfm_cart_items_user_id_idx on public.gfm_cart_items (user_id);

alter table public.gfm_cart_items enable row level security;

drop policy if exists "gfm_cart_items_all" on public.gfm_cart_items;
create policy "gfm_cart_items_all" on public.gfm_cart_items for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_cart_items to anon, authenticated;

notify pgrst, 'reload schema';

select 'OK: gfm_cart_items is ready' as status
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'gfm_cart_items'
);
