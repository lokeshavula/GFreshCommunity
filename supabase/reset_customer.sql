-- Create / reset a normal customer account
-- Use the regular Login screen (not Admin Login) with:
--   Mobile: 9000000001
--   Password: User@123

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
  'G-Fresh Customer',
  '9000000001',
  'B',
  '202',
  'User@123',
  false
where not exists (
  select 1 from public.gfm_users where mobile_number = '9000000001'
);

update public.gfm_users
set
  is_admin = false,
  password = 'User@123',
  full_name = coalesce(nullif(full_name, ''), 'G-Fresh Customer'),
  block_number = coalesce(nullif(block_number, ''), 'B'),
  flat_no = coalesce(nullif(flat_no, ''), '202')
where mobile_number = '9000000001';

notify pgrst, 'reload schema';

select full_name, mobile_number, is_admin, password, block_number, flat_no
from public.gfm_users
where mobile_number = '9000000001';
