-- Date-based vegetable & fruit prices
-- Run AFTER gfm_product_prices.sql. Safe to re-run.

create table if not exists public.gfm_product_daily_prices (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  price_date date not null,
  price numeric(10, 2) not null check (price > 0),
  category_slug text,
  updated_at timestamptz not null default now(),
  unique (sku, price_date)
);

create index if not exists gfm_product_daily_prices_date_idx
  on public.gfm_product_daily_prices (price_date desc);

create index if not exists gfm_product_daily_prices_sku_date_idx
  on public.gfm_product_daily_prices (sku, price_date desc);

alter table public.gfm_product_daily_prices enable row level security;

drop policy if exists "gfm_product_daily_prices_all" on public.gfm_product_daily_prices;
create policy "gfm_product_daily_prices_all"
  on public.gfm_product_daily_prices for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.gfm_product_daily_prices to anon, authenticated;

-- Seed today's prices from current products catalog (veg + fruit with sku) if table exists
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'products') then
    insert into public.gfm_product_daily_prices (sku, price_date, price, category_slug)
    select
      p.sku,
      (timezone('Asia/Kolkata', now()))::date,
      p.price,
      p.category_slug
    from public.products p
    where p.sku is not null
      and p.category_slug in ('vegetables', 'fruits')
      and coalesce(p.is_active, true) = true
    on conflict (sku, price_date) do nothing;
  end if;
end $$;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
