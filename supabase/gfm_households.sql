-- Household management for G Fresh Mart (Feature 2)
-- Run after gfm_user_approval.sql
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

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

alter table public.gfm_users
  add column if not exists household_id uuid references public.gfm_households(id);

create index if not exists gfm_households_community_idx
  on public.gfm_households (community_id);

create index if not exists gfm_households_primary_user_idx
  on public.gfm_households (primary_user_id);

create index if not exists gfm_users_household_id_idx
  on public.gfm_users (household_id);

-- One ACTIVE household per community + tower + flat
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
create policy "gfm_households_all" on public.gfm_households
  for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_households to anon, authenticated;

notify pgrst, 'reload schema';
