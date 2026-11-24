-- Login tracking schema (also add to RUN_THIS.sql)
-- Run in Supabase SQL Editor

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

notify pgrst, 'reload schema';
