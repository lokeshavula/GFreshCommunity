-- Run when gfm_orders already exists and you only need status columns + schema reload

alter table public.gfm_orders add column if not exists status text not null default 'placed';
alter table public.gfm_orders add column if not exists status_updated_at timestamptz not null default now();

grant select, insert, update, delete on public.gfm_orders to anon, authenticated;
grant select, insert, update, delete on public.gfm_users to anon, authenticated;

drop policy if exists "gfm_orders_update" on public.gfm_orders;
create policy "gfm_orders_update" on public.gfm_orders for update using (true) with check (true);

drop policy if exists "gfm_orders_delete" on public.gfm_orders;
create policy "gfm_orders_delete" on public.gfm_orders for delete using (true);

notify pgrst, 'reload schema';
