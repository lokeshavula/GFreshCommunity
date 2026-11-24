import { createClient } from '@supabase/supabase-js';
import { ENV, isSupabaseConfigured } from '../config/env';

export const supabase = isSupabaseConfigured()
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  : null;
