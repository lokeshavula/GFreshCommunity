-- Supabase Schema for Fresh Arrivals ("Just Arrived" Real-Time Stories Feed)
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create table if not exists public.gfm_fresh_arrivals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  category_tag text not null default 'all',
  category_emoji text not null default '✨',
  image_url text not null,
  price numeric(10, 2),
  unit text default 'pack',
  product_id text,
  stock_quantity_label text,
  badge_text text default 'LIVE • JUST ARRIVED',
  arrived_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '24 hours'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Index for real-time order and active filtering
create index if not exists gfm_fresh_arrivals_active_idx
  on public.gfm_fresh_arrivals (is_active, arrived_at desc);

create index if not exists gfm_fresh_arrivals_category_idx
  on public.gfm_fresh_arrivals (category_tag);

-- Enable RLS
alter table public.gfm_fresh_arrivals enable row level security;

-- Policies: public can read active stories, authenticated/anon can insert/manage
drop policy if exists "gfm_fresh_arrivals_read" on public.gfm_fresh_arrivals;
create policy "gfm_fresh_arrivals_read"
  on public.gfm_fresh_arrivals for select
  to anon, authenticated
  using (true);

drop policy if exists "gfm_fresh_arrivals_write" on public.gfm_fresh_arrivals;
create policy "gfm_fresh_arrivals_write"
  on public.gfm_fresh_arrivals for all
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.gfm_fresh_arrivals to anon, authenticated;

-- Seed initial fresh arrivals batch
insert into public.gfm_fresh_arrivals (
  title,
  subtitle,
  category_tag,
  category_emoji,
  image_url,
  price,
  unit,
  stock_quantity_label,
  badge_text,
  arrived_at
) values
(
  'Fresh Alphonso Mangoes Arrived',
  'Directly from Ratnagiri orchards • Sweet, aromatic & 100% naturally ripened',
  'mangoes',
  '🥭',
  'https://images.unsplash.com/photo-1553279768-865429fa0078?w=900&auto=format&fit=crop&q=80',
  299.00,
  'dozen',
  'Limited 35 boxes available',
  'LIVE • JUST ARRIVED',
  now() - interval '12 minutes'
),
(
  'Fresh Sea Pomfret Fish Received',
  'Morning coastal catch • Cleaned, gutted and ice-packed for ultimate freshness',
  'fish',
  '🐟',
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&auto=format&fit=crop&q=80',
  450.00,
  '500g',
  'Only 14 kg left today',
  'LIVE • MORNING CATCH',
  now() - interval '38 minutes'
),
(
  'Farm Fresh Organic Vegetables',
  'Crisp English cucumber, green capsicum, broccoli & tender coriander just unloaded',
  'veggies',
  '🥦',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&auto=format&fit=crop&q=80',
  65.00,
  '500g',
  'Harvested 3 hours ago',
  'LIVE • FARM HARVEST',
  now() - interval '1 hour 15 minutes'
),
(
  'Pure Desi Cow Fresh Milk & Paneer',
  'Morning batch pure raw milk & soft artisan malai paneer',
  'milk',
  '🥛',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=900&auto=format&fit=crop&q=80',
  42.00,
  '500ml',
  'Fresh morning delivery',
  'LIVE • MORNING MILK',
  now() - interval '2 hours'
),
(
  'Jumbo Tiger Prawns Stock Arrived',
  'Premium grade ocean prawns • Cleaned, deveined & ready to cook',
  'prawns',
  '🦐',
  'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=900&auto=format&fit=crop&q=80',
  380.00,
  '500g',
  'Fresh sea catch • 18 boxes',
  'LIVE • SEAFOOD SPECIAL',
  now() - interval '25 minutes'
);
