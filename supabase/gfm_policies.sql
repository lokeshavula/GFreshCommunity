-- Run after adding status columns to refresh Supabase API schema cache
-- Dashboard: https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

-- 1. Ensure columns exist
alter table public.gfm_orders add column if not exists status text not null default 'placed';
alter table public.gfm_orders add column if not exists status_updated_at timestamptz not null default now();

-- 2. Ensure anon/authenticated roles can update & delete
grant select, insert, update, delete on public.gfm_orders to anon, authenticated;
grant select, insert, update, delete on public.gfm_users to anon, authenticated;

-- 3. Explicit update/delete policies (safe to re-run)
drop policy if exists "gfm_orders_update" on public.gfm_orders;
create policy "gfm_orders_update" on public.gfm_orders for update using (true) with check (true);

drop policy if exists "gfm_orders_delete" on public.gfm_orders;
create policy "gfm_orders_delete" on public.gfm_orders for delete using (true);

-- 4. Select/insert policies (safe to re-run)
drop policy if exists "gfm_orders_select" on public.gfm_orders;
create policy "gfm_orders_select" on public.gfm_orders for select using (true);

drop policy if exists "gfm_orders_insert" on public.gfm_orders;
create policy "gfm_orders_insert" on public.gfm_orders for insert with check (true);

drop policy if exists "gfm_users_select" on public.gfm_users;
create policy "gfm_users_select" on public.gfm_users for select using (true);

drop policy if exists "gfm_users_insert" on public.gfm_users;
create policy "gfm_users_insert" on public.gfm_users for insert with check (true);

drop policy if exists "gfm_users_update" on public.gfm_users;
create policy "gfm_users_update" on public.gfm_users for update using (true) with check (true);

-- 5. Reload PostgREST schema cache (fixes "column not in schema cache" errors)
notify pgrst, 'reload schema';
