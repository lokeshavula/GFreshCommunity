import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import { GfmCommunity, GfmCommunityRow } from '../types/gfm';
import { getErrorMessage } from '../utils/errorMessage';

function mapCommunity(row: GfmCommunityRow): GfmCommunity {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
  };
}

export async function fetchCommunities(): Promise<GfmCommunity[]> {
  if (!supabase) {
    return [
      {
        id: 'local-default',
        name: 'Adithya Capitol Heights',
        city: 'Hyderabad',
        state: 'Telangana',
      },
    ];
  }

  const { data, error } = await supabase
    .from('gfm_communities')
    .select('id, name, address, city, state, status, created_at')
    .eq('status', 'ACTIVE')
    .order('name');

  if (error) {
    console.warn('[communityService] fetchCommunities:', error.message);
    return [
      {
        id: 'local-default',
        name: 'Adithya Capitol Heights',
        city: 'Hyderabad',
        state: 'Telangana',
      },
    ];
  }

  const rows = (data as GfmCommunityRow[]) ?? [];
  if (rows.length === 0) {
    return [
      {
        id: 'local-default',
        name: 'Adithya Capitol Heights',
        city: 'Hyderabad',
        state: 'Telangana',
      },
    ];
  }

  return rows.map(mapCommunity);
}

export async function fetchCommunityName(communityId: string | null | undefined): Promise<string | null> {
  if (!communityId || !supabase || communityId === 'local-default') {
    return communityId === 'local-default' ? 'Adithya Capitol Heights' : null;
  }

  const { data, error } = await supabase
    .from('gfm_communities')
    .select('name')
    .eq('id', communityId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return (data as { name: string }).name;
}

export async function ensureCommunityExists(name: string): Promise<string | null> {
  if (!supabase) {
    return 'local-default';
  }

  const trimmed = name.trim();
  const { data: existing } = await supabase
    .from('gfm_communities')
    .select('id')
    .eq('name', trimmed)
    .maybeSingle();

  if (existing) {
    return (existing as { id: string }).id;
  }

  const { data, error } = await supabase
    .from('gfm_communities')
    .insert({ name: trimmed, status: 'ACTIVE' })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not save community.'));
  }

  return (data as { id: string }).id;
}
