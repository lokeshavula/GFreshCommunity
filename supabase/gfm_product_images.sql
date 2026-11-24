-- Product catalog images: main + 3 angle views (front / side / back)
-- Run AFTER gfm_product_prices.sql. Safe to re-run.

alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists image_front_url text;
alter table public.products add column if not exists image_side_url text;
alter table public.products add column if not exists image_back_url text;

notify pgrst, 'reload schema';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name in ('image_url', 'image_front_url', 'image_side_url', 'image_back_url')
order by column_name;
