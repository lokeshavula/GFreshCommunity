-- User registration approval system for G Fresh Mart
-- Run in Supabase SQL Editor after gfm_schema.sql
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create extension if not exists "pgcrypto";

-- ---------- communities (multi-community ready) ----------
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

-- ---------- user approval columns ----------
alter table public.gfm_users
  add column if not exists email text;

alter table public.gfm_users
  add column if not exists community_id uuid references public.gfm_communities(id);

alter table public.gfm_users
  add column if not exists tower text;

alter table public.gfm_users
  add column if not exists account_status text not null default 'PENDING_APPROVAL';

alter table public.gfm_users
  add column if not exists approved_at timestamptz;

alter table public.gfm_users
  add column if not exists approved_by uuid references public.gfm_users(id);

alter table public.gfm_users
  add column if not exists rejection_reason text;

alter table public.gfm_users
  add column if not exists rejected_at timestamptz;

alter table public.gfm_users
  add column if not exists updated_at timestamptz not null default now();

-- Existing users & admins → ACTIVE (do not block current customers)
update public.gfm_users
set account_status = 'ACTIVE'
where account_status = 'PENDING_APPROVAL'
  and (is_admin = true or created_at < now() - interval '1 minute');

-- Admins always active
update public.gfm_users
set account_status = 'ACTIVE'
where is_admin = true;

create index if not exists gfm_users_account_status_idx
  on public.gfm_users (account_status);

create index if not exists gfm_users_community_id_idx
  on public.gfm_users (community_id);

-- ---------- approval audit trail ----------
create table if not exists public.gfm_approval_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gfm_users(id) on delete cascade,
  status text not null,
  reviewed_by uuid references public.gfm_users(id),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists gfm_approval_records_user_id_idx
  on public.gfm_approval_records (user_id, created_at desc);

-- ---------- in-app notifications ----------
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

create index if not exists gfm_notifications_user_id_idx
  on public.gfm_notifications (user_id, created_at desc);

-- ---------- RLS ----------
alter table public.gfm_communities enable row level security;
alter table public.gfm_approval_records enable row level security;
alter table public.gfm_notifications enable row level security;

drop policy if exists "gfm_communities_read" on public.gfm_communities;
create policy "gfm_communities_read" on public.gfm_communities
  for select using (status = 'ACTIVE');

drop policy if exists "gfm_approval_records_all" on public.gfm_approval_records;
create policy "gfm_approval_records_all" on public.gfm_approval_records
  for all using (true) with check (true);

drop policy if exists "gfm_notifications_all" on public.gfm_notifications;
create policy "gfm_notifications_all" on public.gfm_notifications
  for all using (true) with check (true);

grant select on public.gfm_communities to anon, authenticated;
grant select, insert, update, delete on public.gfm_approval_records to anon, authenticated;
grant select, insert, update, delete on public.gfm_notifications to anon, authenticated;

notify pgrst, 'reload schema';
