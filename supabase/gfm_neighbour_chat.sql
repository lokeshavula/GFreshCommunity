-- Neighbour connections and chat messages for G-Fresh Community (Neighbour Hub)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kffsanwjjuapqeyskzku/sql/new

create table if not exists public.gfm_neighbour_connections (
  id uuid primary key default gen_random_uuid(),
  user_id_1 uuid not null references public.gfm_users(id) on delete cascade,
  user_id_2 uuid not null references public.gfm_users(id) on delete cascade,
  status text not null default 'pending', -- 'pending', 'connected', 'rejected'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id_1, user_id_2)
);

create table if not exists public.gfm_neighbour_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sender_id uuid not null references public.gfm_users(id) on delete cascade,
  receiver_id uuid references public.gfm_users(id) on delete cascade,
  text text not null,
  message_type text not null default 'text', -- 'text', 'product_share', 'group_deal'
  product_data jsonb,
  group_deal_data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gfm_neighbour_conn_idx1 on public.gfm_neighbour_connections(user_id_1);
create index if not exists gfm_neighbour_conn_idx2 on public.gfm_neighbour_connections(user_id_2);
create index if not exists gfm_neighbour_msg_conv_idx on public.gfm_neighbour_messages(conversation_id, created_at asc);

alter table public.gfm_neighbour_connections enable row level security;
alter table public.gfm_neighbour_messages enable row level security;

drop policy if exists "gfm_neighbour_connections_all" on public.gfm_neighbour_connections;
create policy "gfm_neighbour_connections_all" on public.gfm_neighbour_connections for all using (true) with check (true);

drop policy if exists "gfm_neighbour_messages_all" on public.gfm_neighbour_messages;
create policy "gfm_neighbour_messages_all" on public.gfm_neighbour_messages for all using (true) with check (true);

grant select, insert, update, delete on public.gfm_neighbour_connections to anon, authenticated;
grant select, insert, update, delete on public.gfm_neighbour_messages to anon, authenticated;

notify pgrst, 'reload schema';
