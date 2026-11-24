-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create extension if not exists "pgcrypto";

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

alter table public.products enable row level security;
alter table public.categories enable row level security;

create policy "Public read products"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "Public read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

-- Seed products (matches app UI)
insert into public.products (name, subtitle, price, unit, image_url, is_popular) values
  ('Fresh Carrot', 'Directly from the farm', 50.00, 'kg', 'carrot.png', true),
  ('Water Melon', 'Directly from the farm', 80.00, 'kg', 'https://images.unsplash.com/photo-1582281298055-e25b84a30b0b?w=900&auto=format&fit=crop&q=60', true),
  ('Dairy Milk Silk Oreo', 'Directly from the farm', 50.00, 'kg', 'dairymilk.png', true),
  ('Fresh Grapes', 'Directly from the farm', 50.00, 'kg', 'grapes.png', true),
  ('Pantene Hair Fall Control', 'Advanced hairfall solution shampoo', 299.00, 'bottle', 'shampoo.png', false);

-- Seed categories
insert into public.categories (slug, name, section_id, section_title, image_url, sort_order) values
  ('vegetables', 'Vegetables', 'grocery', 'Grocery & Kitchen', 'califower.png', 1),
  ('bakery', 'Bakery & Biscuits', 'grocery', 'Grocery & Kitchen', 'biscuits&bakery.png', 2),
  ('oil', 'Refined Oil & Ghee', 'grocery', 'Grocery & Kitchen', 'oil.png', 3),
  ('pan', 'Pan Corner', 'grocery', 'Grocery & Kitchen', 'pan.png', 4),
  ('dry-fruits', 'Dry Fruits & Cerals', 'grocery', 'Grocery & Kitchen', 'dryfruits.png', 5),
  ('fruits', 'Fresh Fruits', 'grocery', 'Grocery & Kitchen', 'fruits.png', 6),
  ('masala', 'Masala Spices & More', 'grocery', 'Grocery & Kitchen', 'masala.png', 7),
  ('dairy', 'Eggs & Dairy Products', 'grocery', 'Grocery & Kitchen', 'eggs.png', 8),
  ('chips', 'Chips & Namkeen', 'snacks', 'Snacks & Drinks', 'chips.png', 1),
  ('drinks', 'Drinks & Juices', 'snacks', 'Snacks & Drinks', 'drinks.png', 2),
  ('sweets', 'Sweets & Chocolates', 'snacks', 'Snacks & Drinks', 'sweets.png', 3),
  ('tea-coffee', 'Tea, Coffee & Milk Shakes', 'snacks', 'Snacks & Drinks', 'coffee.png', 4),
  ('noodles', 'Breads & More', 'snacks', 'Snacks & Drinks', 'breads.png', 5),
  ('sauces', 'Sauces & Spreads', 'snacks', 'Snacks & Drinks', 'sauces.png', 6),
  ('instant', 'Instant Food & More', 'snacks', 'Snacks & Drinks', 'instant.png', 7),
  ('ice-cream', 'Ice Cream', 'snacks', 'Snacks & Drinks', 'icecream.png', 8)
on conflict (slug) do nothing;
