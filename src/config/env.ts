import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';
import { SUPABASE_KEYS } from './supabase.keys';

/**
 * Keys load from (first non-empty wins):
 * 1. src/config/supabase.keys.ts  ← easiest for React Native
 * 2. .env.local                   ← SUPABASE_URL / SUPABASE_ANON_KEY
 */
export const ENV = {
  SUPABASE_URL: (SUPABASE_KEYS.url || SUPABASE_URL || '').trim(),
  SUPABASE_ANON_KEY: (SUPABASE_KEYS.anonKey || SUPABASE_ANON_KEY || '').trim(),
};

const PLACEHOLDER_KEYS = new Set(['', 'PASTE_ANON_KEY_HERE', 'your-anon-key-here']);

export const isSupabaseConfigured = (): boolean =>
  ENV.SUPABASE_URL.length > 0 &&
  ENV.SUPABASE_ANON_KEY.length > 0 &&
  !PLACEHOLDER_KEYS.has(ENV.SUPABASE_ANON_KEY);

export const getSupabaseConfigError = (): string | null => {
  if (isSupabaseConfigured()) {
    return null;
  }

  if (!ENV.SUPABASE_URL) {
    return 'Missing SUPABASE_URL. Add it in src/config/supabase.keys.ts or .env.local';
  }

  return 'Add your Supabase anon key in src/config/supabase.keys.ts, then restart Metro.';
};
