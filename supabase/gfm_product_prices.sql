-- Daily vegetable & fruit prices
-- Run in Supabase SQL Editor once. Safe to re-run (upsert by sku).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  price numeric(10, 2) not null,
  unit text not null default 'kg',
  image_url text,
  is_popular boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists category_slug text;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists updated_at timestamptz not null default now();

-- Unique sku (multiple NULLs allowed for legacy rows without sku)
drop index if exists products_sku_unique;
create unique index products_sku_unique on public.products (sku);

create index if not exists products_category_slug_idx
  on public.products (category_slug)
  where category_slug is not null;

alter table public.products enable row level security;

drop policy if exists "Public read products" on public.products;
create policy "Public read products"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "products_write_all" on public.products;
create policy "products_write_all"
  on public.products for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.products to anon, authenticated;

-- Seed vegetables + fruits (current app catalog prices). Upsert by sku.
insert into public.products (sku, name, subtitle, price, unit, category_slug, is_active)
values
  ('veg-broccoli', 'Broccoli', 'Farm fresh quality', 45.00, 'kg', 'vegetables', true),
  ('veg-carrot', 'Carrot', 'Farm fresh quality', 50.00, 'kg', 'vegetables', true),
  ('veg-cauliflower', 'Cauliflower', 'Farm fresh quality', 40.00, 'piece', 'vegetables', true),
  ('veg-tomato', 'Tomato', 'Farm fresh quality', 35.00, 'kg', 'vegetables', true),
  ('veg-onion', 'Onion', 'Farm fresh quality', 30.00, 'kg', 'vegetables', true),
  ('veg-potato', 'Potato', 'Farm fresh quality', 28.00, 'kg', 'vegetables', true),
  ('veg-brinjal', 'Brinjal', 'Farm fresh quality', 40.00, 'kg', 'vegetables', true),
  ('veg-cabbage', 'Cabbage', 'Farm fresh quality', 25.00, 'piece', 'vegetables', true),
  ('veg-capsicum', 'Capsicum', 'Farm fresh quality', 60.00, 'kg', 'vegetables', true),
  ('veg-green-chilli', 'Green Chilli', 'Farm fresh quality', 80.00, 'kg', 'vegetables', true),
  ('veg-red-chilli', 'Red Chilli', 'Farm fresh quality', 90.00, 'kg', 'vegetables', true),
  ('veg-ginger', 'Ginger', 'Farm fresh quality', 120.00, 'kg', 'vegetables', true),
  ('veg-garlic', 'Garlic', 'Farm fresh quality', 150.00, 'kg', 'vegetables', true),
  ('veg-beetroot', 'Beetroot', 'Farm fresh quality', 45.00, 'kg', 'vegetables', true),
  ('veg-spinach', 'Spinach (Palak)', 'Farm fresh quality', 30.00, 'bunch', 'vegetables', true),
  ('veg-methi', 'Methi Leaves', 'Farm fresh quality', 25.00, 'bunch', 'vegetables', true),
  ('veg-coriander', 'Coriander Leaves', 'Farm fresh quality', 15.00, 'bunch', 'vegetables', true),
  ('veg-mint', 'Mint Leaves', 'Farm fresh quality', 20.00, 'bunch', 'vegetables', true),
  ('veg-curry-leaves', 'Curry Leaves', 'Farm fresh quality', 10.00, 'bunch', 'vegetables', true),
  ('veg-lady-finger', 'Lady Finger (Bhindi)', 'Farm fresh quality', 50.00, 'kg', 'vegetables', true),
  ('veg-bottle-gourd', 'Bottle Gourd (Lauki)', 'Farm fresh quality', 35.00, 'piece', 'vegetables', true),
  ('veg-bitter-gourd', 'Bitter Gourd (Karela)', 'Farm fresh quality', 45.00, 'kg', 'vegetables', true),
  ('veg-ridge-gourd', 'Ridge Gourd (Turai)', 'Farm fresh quality', 40.00, 'kg', 'vegetables', true),
  ('veg-pumpkin', 'Pumpkin', 'Farm fresh quality', 30.00, 'kg', 'vegetables', true),
  ('veg-sweet-corn', 'Sweet Corn', 'Farm fresh quality', 35.00, 'piece', 'vegetables', true),
  ('veg-green-peas', 'Green Peas', 'Farm fresh quality', 90.00, 'kg', 'vegetables', true),
  ('veg-french-beans', 'French Beans', 'Farm fresh quality', 55.00, 'kg', 'vegetables', true),
  ('veg-cluster-beans', 'Cluster Beans', 'Farm fresh quality', 50.00, 'kg', 'vegetables', true),
  ('veg-drumstick', 'Drumstick', 'Farm fresh quality', 60.00, 'bunch', 'vegetables', true),
  ('veg-radish', 'Radish (Mooli)', 'Farm fresh quality', 30.00, 'kg', 'vegetables', true),
  ('veg-cucumber', 'Cucumber', 'Farm fresh quality', 35.00, 'kg', 'vegetables', true),
  ('veg-lettuce', 'Lettuce', 'Farm fresh quality', 45.00, 'piece', 'vegetables', true),
  ('veg-mushroom', 'Mushroom', 'Farm fresh quality', 120.00, 'pack', 'vegetables', true),
  ('veg-spring-onion', 'Spring Onion', 'Farm fresh quality', 25.00, 'bunch', 'vegetables', true),
  ('veg-sweet-potato', 'Sweet Potato', 'Farm fresh quality', 40.00, 'kg', 'vegetables', true),
  ('veg-turnip', 'Turnip', 'Farm fresh quality', 35.00, 'kg', 'vegetables', true),
  ('veg-zucchini', 'Zucchini', 'Farm fresh quality', 70.00, 'kg', 'vegetables', true),
  ('veg-colocasia', 'Colocasia (Arbi)', 'Farm fresh quality', 45.00, 'kg', 'vegetables', true),
  ('veg-raw-banana', 'Raw Banana', 'Farm fresh quality', 40.00, 'kg', 'vegetables', true),
  ('veg-lemon', 'Lemon', 'Farm fresh quality', 80.00, 'kg', 'vegetables', true),
  ('fruit-apple', 'Red Apple', 'Crisp and sweet', 120.00, 'kg', 'fruits', true),
  ('fruit-grapes', 'Green Grapes', 'Seedless grapes', 90.00, 'kg', 'fruits', true),
  ('fruit-watermelon', 'Watermelon', 'Sweet and juicy', 80.00, 'kg', 'fruits', true),
  ('fruit-banana', 'Banana', 'Farm fresh quality', 50.00, 'dozen', 'fruits', true),
  ('fruit-mango', 'Mango', 'Farm fresh quality', 100.00, 'kg', 'fruits', true),
  ('fruit-papaya', 'Papaya', 'Farm fresh quality', 45.00, 'kg', 'fruits', true),
  ('fruit-pomegranate', 'Pomegranate', 'Farm fresh quality', 150.00, 'kg', 'fruits', true),
  ('fruit-orange', 'Orange', 'Farm fresh quality', 70.00, 'kg', 'fruits', true),
  ('fruit-mosambi', 'Mosambi', 'Farm fresh quality', 65.00, 'kg', 'fruits', true),
  ('fruit-pineapple', 'Pineapple', 'Farm fresh quality', 60.00, 'piece', 'fruits', true),
  ('fruit-kiwi', 'Kiwi', 'Farm fresh quality', 180.00, 'pack', 'fruits', true),
  ('fruit-strawberry', 'Strawberry', 'Farm fresh quality', 200.00, 'pack', 'fruits', true),
  ('fruit-blueberry', 'Blueberry', 'Farm fresh quality', 350.00, 'pack', 'fruits', true),
  ('fruit-pear', 'Pear', 'Farm fresh quality', 110.00, 'kg', 'fruits', true),
  ('fruit-guava', 'Guava', 'Farm fresh quality', 55.00, 'kg', 'fruits', true),
  ('fruit-chiku', 'Chiku (Sapota)', 'Farm fresh quality', 80.00, 'kg', 'fruits', true),
  ('fruit-dragon', 'Dragon Fruit', 'Farm fresh quality', 120.00, 'piece', 'fruits', true),
  ('fruit-coconut', 'Fresh Coconut', 'Farm fresh quality', 45.00, 'piece', 'fruits', true),
  ('fruit-lemon', 'Lemon', 'Farm fresh quality', 80.00, 'kg', 'fruits', true),
  ('fruit-mixed', 'Mixed Fruit Box', 'Seasonal selection', 150.00, 'box', 'fruits', true)
on conflict (sku) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  price = excluded.price,
  unit = excluded.unit,
  category_slug = excluded.category_slug,
  is_active = excluded.is_active,
  updated_at = now();

-- Mark a few produce items as popular for home (optional)
update public.products
set is_popular = true, updated_at = now()
where sku in ('veg-carrot', 'fruit-watermelon', 'fruit-grapes', 'veg-tomato');
