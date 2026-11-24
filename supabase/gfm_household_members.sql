-- Household members (Feature 3): primary, adult, child + permissions
-- Run after gfm_households.sql
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

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

create index if not exists gfm_household_members_household_idx
  on public.gfm_household_members (household_id);

create index if not exists gfm_household_members_user_idx
  on public.gfm_household_members (user_id);

-- One active PRIMARY per household
drop index if exists gfm_household_members_primary_unique;
create unique index gfm_household_members_primary_unique
  on public.gfm_household_members (household_id)
  where role = 'PRIMARY' and status = 'ACTIVE';

-- One active linked user per household
drop index if exists gfm_household_members_user_unique;
create unique index gfm_household_members_user_unique
  on public.gfm_household_members (household_id, user_id)
  where user_id is not null and status = 'ACTIVE';

alter table public.gfm_household_members enable row level security;

drop policy if exists "gfm_household_members_all" on public.gfm_household_members;
create policy "gfm_household_members_all" on public.gfm_household_members
  for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_household_members to anon, authenticated;

-- Backfill PRIMARY members from existing households
insert into public.gfm_household_members (
  household_id,
  user_id,
  display_name,
  mobile_number,
  role,
  can_order,
  can_manage_members,
  status
)
select
  h.id,
  h.primary_user_id,
  u.full_name,
  u.mobile_number,
  'PRIMARY',
  true,
  true,
  'ACTIVE'
from public.gfm_households h
join public.gfm_users u on u.id = h.primary_user_id
where h.primary_user_id is not null
  and not exists (
    select 1
    from public.gfm_household_members m
    where m.household_id = h.id
      and m.user_id = h.primary_user_id
      and m.status = 'ACTIVE'
  );

-- Backfill other linked users as ADULT members
insert into public.gfm_household_members (
  household_id,
  user_id,
  display_name,
  mobile_number,
  role,
  can_order,
  can_manage_members,
  status
)
select
  u.household_id,
  u.id,
  u.full_name,
  u.mobile_number,
  case when u.id = h.primary_user_id then 'PRIMARY' else 'ADULT' end,
  true,
  u.id = h.primary_user_id,
  'ACTIVE'
from public.gfm_users u
join public.gfm_households h on h.id = u.household_id
where u.household_id is not null
  and u.account_status = 'ACTIVE'
  and not exists (
    select 1
    from public.gfm_household_members m
    where m.household_id = u.household_id
      and m.user_id = u.id
      and m.status = 'ACTIVE'
  );

notify pgrst, 'reload schema';
