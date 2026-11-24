-- User favourites (heart / Favourite tab)
-- Run in Supabase SQL Editor once. Safe to re-run.

create table if not exists public.gfm_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  product_id text not null,
  name text not null,
  subtitle text not null default '',
  price numeric not null default 0,
  unit text not null default 'pack',
  image_url text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists gfm_favourites_user_id_idx
  on public.gfm_favourites (user_id);

create index if not exists gfm_favourites_created_at_idx
  on public.gfm_favourites (created_at desc);

alter table public.gfm_favourites enable row level security;

drop policy if exists "gfm_favourites_all" on public.gfm_favourites;
create policy "gfm_favourites_all"
  on public.gfm_favourites for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.gfm_favourites to anon, authenticated;

notify pgrst, 'reload schema';

select 'OK: gfm_favourites is ready' as status
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'gfm_favourites'
);
