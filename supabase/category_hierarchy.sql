-- Two-level categories: main section (Fruits) + items under it (Apple, Mango)
-- Run in Supabase SQL Editor, then: notify pgrst, 'reload schema';

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade;

create index if not exists categories_parent_id_idx on public.categories (parent_id);

-- Main sections have parent_id = null; items have parent_id = main section id
notify pgrst, 'reload schema';
