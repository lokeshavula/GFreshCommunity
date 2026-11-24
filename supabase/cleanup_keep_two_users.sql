-- Wipe all user / account / login-related data EXCEPT:
--   Admin   : 8008216667  /  Admin@123   (Admin Login)
--   Customer: 7032265666  /  User@123    (regular Login)
--
-- Note: admin mobile is 8008216667 (10 digits).
-- Run in Supabase SQL Editor. Safe to re-run.
-- Keeps products, categories, communities, and price tables.

-- ---------- 1) Ensure keep accounts ----------
alter table public.gfm_users
  add column if not exists is_admin boolean not null default false;

alter table public.gfm_users
  add column if not exists account_status text not null default 'PENDING_APPROVAL';

alter table public.gfm_users
  add column if not exists updated_at timestamptz not null default now();

insert into public.gfm_users (
  full_name, mobile_number, block_number, flat_no, password, is_admin, account_status
)
select 'G-Fresh Admin', '8008216667', 'A', '101', 'Admin@123', true, 'ACTIVE'
where not exists (
  select 1 from public.gfm_users where mobile_number = '8008216667'
);

insert into public.gfm_users (
  full_name, mobile_number, block_number, flat_no, password, is_admin, account_status
)
select 'G-Fresh Customer', '7032265666', 'B', '202', 'User@123', false, 'ACTIVE'
where not exists (
  select 1 from public.gfm_users where mobile_number = '7032265666'
);

update public.gfm_users
set
  is_admin = true,
  password = 'Admin@123',
  account_status = 'ACTIVE',
  full_name = coalesce(nullif(full_name, ''), 'G-Fresh Admin'),
  updated_at = now()
where mobile_number = '8008216667';

update public.gfm_users
set
  is_admin = false,
  password = 'User@123',
  account_status = 'ACTIVE',
  full_name = coalesce(nullif(full_name, ''), 'G-Fresh Customer'),
  updated_at = now()
where mobile_number = '7032265666';

-- Drop mistyped 9-digit admin if present
delete from public.gfm_users where mobile_number = '800821667';

-- ---------- 2) Cleanup via PL/pgSQL (skips missing tables) ----------
do $$
declare
  keep_ids uuid[];
  keep_id_texts text[];
begin
  select array_agg(id), array_agg(id::text)
  into keep_ids, keep_id_texts
  from public.gfm_users
  where mobile_number in ('8008216667', '7032265666');

  if keep_ids is null or array_length(keep_ids, 1) is null then
    raise exception 'Keep users not found. Aborting cleanup.';
  end if;

  -- Clear approval pointers to users about to be deleted
  begin
    update public.gfm_users
    set approved_by = null
    where approved_by is not null
      and not (approved_by = any (keep_ids));
  exception when undefined_column then null;
  end;

  begin
    update public.gfm_users
    set household_id = null
    where not (id = any (keep_ids));
  exception when undefined_column then null;
  end;

  begin
    update public.gfm_households
    set primary_user_id = null
    where primary_user_id is not null
      and not (primary_user_id = any (keep_ids));
  exception when undefined_table then null;
  end;

  -- uuid user_id tables
  begin
    delete from public.gfm_login_logs
    where not (user_id = any (keep_ids));
  exception when undefined_table then null;
  end;

  begin
    delete from public.gfm_notifications
    where not (user_id = any (keep_ids));
  exception when undefined_table then null;
  end;

  begin
    delete from public.gfm_approval_records
    where not (user_id = any (keep_ids))
       or (reviewed_by is not null and not (reviewed_by = any (keep_ids)));
  exception when undefined_table then null;
  end;

  begin
    delete from public.gfm_delivery_schedules
    where not (user_id = any (keep_ids));
  exception when undefined_table then null;
  end;

  begin
    delete from public.gfm_household_members
    where (user_id is not null and not (user_id = any (keep_ids)))
       or (added_by is not null and not (added_by = any (keep_ids)));
  exception when undefined_table then null;
  end;

  -- text user_id tables (cart / orders)
  begin
    delete from public.gfm_cart_items
    where not (user_id = any (keep_id_texts));
  exception when undefined_table then null;
  end;

  begin
    delete from public.gfm_orders
    where mobile_number not in ('8008216667', '7032265666')
       or not (user_id = any (keep_id_texts));
  exception when undefined_table then null;
  end;

  -- Delete all other users
  delete from public.gfm_users
  where not (id = any (keep_ids));

  -- Orphan households
  begin
    delete from public.gfm_household_members m
    where not exists (
      select 1 from public.gfm_users u where u.household_id = m.household_id
    )
    and not exists (
      select 1 from public.gfm_households h
      where h.id = m.household_id and h.primary_user_id = any (keep_ids)
    );
  exception when undefined_table then null;
  end;

  begin
    delete from public.gfm_households h
    where (h.primary_user_id is null or not (h.primary_user_id = any (keep_ids)))
      and not exists (
        select 1 from public.gfm_users u where u.household_id = h.id
      );
  exception when undefined_table then null;
  end;
end $$;

notify pgrst, 'reload schema';

-- ---------- 3) Verify (should return exactly 2 rows) ----------
select full_name, mobile_number, is_admin, account_status, password
from public.gfm_users
order by is_admin desc, mobile_number;
