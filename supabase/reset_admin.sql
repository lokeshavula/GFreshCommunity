-- Reset admin login (run in Supabase SQL Editor)
-- After this, use Admin Login with:
--   Mobile: 8008216667
--   Password: Admin@123

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
  password = 'Admin@123',
  full_name = coalesce(nullif(full_name, ''), 'G-Fresh Admin')
where mobile_number = '8008216667';

notify pgrst, 'reload schema';

select full_name, mobile_number, is_admin, password
from public.gfm_users
where mobile_number = '8008216667';
