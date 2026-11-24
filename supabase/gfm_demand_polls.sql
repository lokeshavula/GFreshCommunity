-- ============================================================================
-- G-Fresh Mart: "What Do You Want Tomorrow?" Community Demand Polls Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gfm_demand_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  emoji TEXT DEFAULT '📦',
  category TEXT DEFAULT 'fruits',
  image_url TEXT,
  target_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  vote_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'ordered', 'procured', 'arrived'
  estimated_price NUMERIC(10, 2) DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  order_target_qty TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.gfm_demand_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_item_id UUID NOT NULL REFERENCES public.gfm_demand_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  target_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_vote_per_date UNIQUE (user_id, target_date)
);

CREATE TABLE IF NOT EXISTS public.gfm_demand_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_mobile TEXT,
  item_title TEXT NOT NULL,
  note TEXT,
  upvotes INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demand_polls_date ON public.gfm_demand_polls(target_date);
CREATE INDEX IF NOT EXISTS idx_demand_votes_user_date ON public.gfm_demand_votes(user_id, target_date);

-- Enable RLS
ALTER TABLE public.gfm_demand_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gfm_demand_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gfm_demand_suggestions ENABLE ROW LEVEL SECURITY;

-- Permissive RLS for App Users & Admins
CREATE POLICY "Allow public read demand_polls" ON public.gfm_demand_polls FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update demand_polls" ON public.gfm_demand_polls FOR ALL USING (true);

CREATE POLICY "Allow public read demand_votes" ON public.gfm_demand_votes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update/delete demand_votes" ON public.gfm_demand_votes FOR ALL USING (true);

CREATE POLICY "Allow public read demand_suggestions" ON public.gfm_demand_suggestions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert demand_suggestions" ON public.gfm_demand_suggestions FOR ALL USING (true);

-- Seed Starter Poll Items for Tomorrow
INSERT INTO public.gfm_demand_polls (title, subtitle, emoji, category, target_date, vote_count, estimated_price, unit, order_target_qty)
VALUES
  ('Mangoes (Banganapalli)', 'Farm-fresh sweet summer harvest', '🥭', 'fruits', CURRENT_DATE + INTERVAL '1 day', 45, 120, 'kg', '80 kg'),
  ('Avocado (Hass Fresh)', 'Creamy imported quality Hass avocados', '🥑', 'fruits', CURRENT_DATE + INTERVAL '1 day', 38, 90, 'piece', '40 pcs'),
  ('Fresh Fish (Seer / Vanjaram)', 'Catch of the morning • Cleaned slices', '🐟', 'seafood', CURRENT_DATE + INTERVAL '1 day', 72, 450, 'kg', '35 kg'),
  ('Fresh Tiger Prawns', 'Ocean catch • Deveined & packed fresh', '🦐', 'seafood', CURRENT_DATE + INTERVAL '1 day', 95, 380, '500g', '50 packs')
ON CONFLICT DO NOTHING;
