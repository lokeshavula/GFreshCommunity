-- ============================================================
-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR (one click Run)
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new
-- Fixes: "Database schema is out of date" / schema cache errors
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- gfm_users: admin flag ----------
alter table public.gfm_users
  add column if not exists is_admin boolean not null default false;

alter table public.gfm_users
  add column if not exists avatar_url text;

-- ---------- categories table ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  section_id text,
  section_title text,
  parent_id uuid references public.categories(id) on delete cascade,
  image_url text,
  price numeric(10, 2),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Add missing columns on existing table
alter table public.categories add column if not exists price numeric(10, 2);
alter table public.categories add column if not exists parent_id uuid;
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists sort_order int not null default 0;
alter table public.categories add column if not exists created_at timestamptz not null default now();

-- Add FK for parent_id if not exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_parent_id_fkey'
  ) then
    alter table public.categories
      add constraint categories_parent_id_fkey
      foreign key (parent_id) references public.categories(id) on delete cascade;
  end if;
end $$;

create index if not exists categories_parent_id_idx on public.categories (parent_id);

-- ---------- RLS + policies ----------
alter table public.categories enable row level security;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
  on public.categories for select to anon, authenticated using (true);

drop policy if exists "Public insert categories" on public.categories;
create policy "Public insert categories"
  on public.categories for insert to anon, authenticated with check (true);

drop policy if exists "Public update categories" on public.categories;
create policy "Public update categories"
  on public.categories for update to anon, authenticated using (true) with check (true);

drop policy if exists "Public delete categories" on public.categories;
create policy "Public delete categories"
  on public.categories for delete to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.categories to anon, authenticated;
grant select, insert, update on public.gfm_users to anon, authenticated;

-- ---------- storage for category images ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images',
  'category-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

drop policy if exists "Public read category images" on storage.objects;
create policy "Public read category images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'category-images');

drop policy if exists "Public upload category images" on storage.objects;
create policy "Public upload category images"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'category-images');

drop policy if exists "Public update category images" on storage.objects;
create policy "Public update category images"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'category-images');

-- ---------- make / reset admin user ----------
-- Login with: mobile 8008216667 / password Admin@123
alter table public.gfm_users
  add column if not exists is_admin boolean not null default false;

insert into public.gfm_users (
  full_name,
  mobile_number,
  block_number,
  flat_no,
  password,
  is_admin
)
select
  'G-Fresh Admin',
  '8008216667',
  'A',
  '101',
  'Admin@123',
  true
where not exists (
  select 1 from public.gfm_users where mobile_number = '8008216667'
);

update public.gfm_users
set
  is_admin = true,
  password = 'Admin@123'
where mobile_number = '8008216667';

-- ---------- login tracking ----------
alter table public.gfm_users
  add column if not exists last_login_at timestamptz;

alter table public.gfm_users
  add column if not exists login_count int not null default 0;

create table if not exists public.gfm_login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gfm_users(id) on delete cascade,
  full_name text not null,
  mobile_number text not null,
  role text not null default 'user',
  platform text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists gfm_login_logs_created_at_idx
  on public.gfm_login_logs (created_at desc);

create index if not exists gfm_login_logs_user_id_idx
  on public.gfm_login_logs (user_id);

alter table public.gfm_login_logs enable row level security;

drop policy if exists "gfm_login_logs_all" on public.gfm_login_logs;
create policy "gfm_login_logs_all" on public.gfm_login_logs
  for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_login_logs to anon, authenticated;

-- ---------- user approval (registration + admin review) ----------
create table if not exists public.gfm_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.gfm_communities (name, address, city, state)
select
  'Adithya Capitol Heights',
  'Capitol Heights, Hyderabad',
  'Hyderabad',
  'Telangana'
where not exists (
  select 1 from public.gfm_communities where name = 'Adithya Capitol Heights'
);

alter table public.gfm_users add column if not exists email text;
alter table public.gfm_users add column if not exists community_id uuid references public.gfm_communities(id);
alter table public.gfm_users add column if not exists tower text;
alter table public.gfm_users add column if not exists account_status text not null default 'PENDING_APPROVAL';
alter table public.gfm_users add column if not exists approved_at timestamptz;
alter table public.gfm_users add column if not exists approved_by uuid references public.gfm_users(id);
alter table public.gfm_users add column if not exists rejection_reason text;
alter table public.gfm_users add column if not exists rejected_at timestamptz;
alter table public.gfm_users add column if not exists updated_at timestamptz not null default now();

update public.gfm_users set account_status = 'ACTIVE' where is_admin = true;
update public.gfm_users set account_status = 'ACTIVE'
where account_status = 'PENDING_APPROVAL' and created_at < now() - interval '1 minute';

create table if not exists public.gfm_approval_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gfm_users(id) on delete cascade,
  status text not null,
  reviewed_by uuid references public.gfm_users(id),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.gfm_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gfm_users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.gfm_communities enable row level security;
alter table public.gfm_approval_records enable row level security;
alter table public.gfm_notifications enable row level security;

drop policy if exists "gfm_communities_read" on public.gfm_communities;
create policy "gfm_communities_read" on public.gfm_communities for select using (status = 'ACTIVE');

drop policy if exists "gfm_approval_records_all" on public.gfm_approval_records;
create policy "gfm_approval_records_all" on public.gfm_approval_records for all using (true) with check (true);

drop policy if exists "gfm_notifications_all" on public.gfm_notifications;
create policy "gfm_notifications_all" on public.gfm_notifications for all using (true) with check (true);

grant select on public.gfm_communities to anon, authenticated;
grant select, insert, update, delete on public.gfm_approval_records to anon, authenticated;
grant select, insert, update, delete on public.gfm_notifications to anon, authenticated;

-- ---------- households (Feature 2) ----------
create table if not exists public.gfm_households (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.gfm_communities(id),
  tower text not null,
  flat_number text not null,
  primary_user_id uuid references public.gfm_users(id),
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gfm_users add column if not exists household_id uuid references public.gfm_households(id);

drop index if exists gfm_households_active_unique;
create unique index gfm_households_active_unique
  on public.gfm_households (
    coalesce(community_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(trim(tower)),
    lower(trim(flat_number))
  )
  where status = 'ACTIVE';

alter table public.gfm_households enable row level security;

drop policy if exists "gfm_households_all" on public.gfm_households;
create policy "gfm_households_all" on public.gfm_households for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_households to anon, authenticated;

-- ---------- household members (Feature 3) ----------
create table if not exists public.gfm_household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.gfm_households(id) on delete cascade,
  user_id uuid references public.gfm_users(id) on delete set null,
  display_name text not null,
  mobile_number text,
  role text not null default 'ADULT',
  can_order boolean not null default true,
  can_manage_members boolean not null default false,
  status text not null default 'ACTIVE',
  added_by uuid references public.gfm_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists gfm_household_members_primary_unique;
create unique index gfm_household_members_primary_unique
  on public.gfm_household_members (household_id)
  where role = 'PRIMARY' and status = 'ACTIVE';

drop index if exists gfm_household_members_user_unique;
create unique index gfm_household_members_user_unique
  on public.gfm_household_members (household_id, user_id)
  where user_id is not null and status = 'ACTIVE';

alter table public.gfm_household_members enable row level security;

drop policy if exists "gfm_household_members_all" on public.gfm_household_members;
create policy "gfm_household_members_all" on public.gfm_household_members for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_household_members to anon, authenticated;

-- ---------- delivery schedules ----------
create table if not exists public.gfm_delivery_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gfm_users(id) on delete cascade,
  household_id uuid references public.gfm_households(id) on delete set null,
  delivery_type text not null default 'ON_DEMAND',
  preferred_weekday text,
  preferred_month_day integer,
  preferred_slot text not null default 'MORNING',
  notes text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists gfm_delivery_schedules_user_unique;
alter table public.gfm_delivery_schedules
  drop constraint if exists gfm_delivery_schedules_user_unique;
alter table public.gfm_delivery_schedules
  add constraint gfm_delivery_schedules_user_unique unique (user_id);

alter table public.gfm_delivery_schedules enable row level security;

drop policy if exists "gfm_delivery_schedules_all" on public.gfm_delivery_schedules;
create policy "gfm_delivery_schedules_all" on public.gfm_delivery_schedules for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_delivery_schedules to anon, authenticated;

-- ---------- RELOAD API SCHEMA CACHE (critical) ----------
notify pgrst, 'reload schema';

-- ---------- verify ----------
select 'categories columns' as check_type, column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'categories'
order by ordinal_position;

select id, name, parent_id, price from public.categories limit 5;

select full_name, mobile_number, is_admin, password
from public.gfm_users
where mobile_number = '8008216667';

-- ---------- sample customer (regular Login screen) ----------
-- Mobile: 9000000001 / Password: User@123
insert into public.gfm_users (
  full_name,
  mobile_number,
  block_number,
  flat_no,
  password,
  is_admin
)
select
  'G-Fresh Customer',
  '7032265666',
  'B',
  '202',
  'User@123',
  false
where not exists (
  select 1 from public.gfm_users where mobile_number = '7032265666'
);

update public.gfm_users
set
  is_admin = false,
  password = 'User@123'
where mobile_number = '7032265666';

select full_name, mobile_number, is_admin, password
from public.gfm_users
where mobile_number in ('8008216667', '7032265666');
