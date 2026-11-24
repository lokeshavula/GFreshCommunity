-- Delivery type & monthly/weekly grocery schedules
-- Run after gfm_households.sql
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

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

-- One schedule preference per user
drop index if exists gfm_delivery_schedules_user_unique;
alter table public.gfm_delivery_schedules
  drop constraint if exists gfm_delivery_schedules_user_unique;
alter table public.gfm_delivery_schedules
  add constraint gfm_delivery_schedules_user_unique unique (user_id);

create index if not exists gfm_delivery_schedules_household_idx
  on public.gfm_delivery_schedules (household_id);

alter table public.gfm_delivery_schedules enable row level security;

drop policy if exists "gfm_delivery_schedules_all" on public.gfm_delivery_schedules;
create policy "gfm_delivery_schedules_all" on public.gfm_delivery_schedules
  for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_delivery_schedules to anon, authenticated;

notify pgrst, 'reload schema';
