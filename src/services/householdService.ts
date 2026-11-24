import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import {
  GfmHousehold,
  GfmHouseholdRow,
  GfmUserRow,
  HouseholdResolveResult,
  HouseholdStatus,
  UpdateHouseholdInput,
} from '../types/gfm';
import { getErrorMessage } from '../utils/errorMessage';
import { fetchCommunityName } from './communityService';

type HouseholdRowWithCommunity = GfmHouseholdRow & {
  gfm_communities?: { name: string } | null;
};

type HouseholdRowWithPrimary = HouseholdRowWithCommunity & {
  primary_user?: {
    full_name: string;
    mobile_number: string;
    email?: string | null;
  } | null;
};

function normalizeTower(value: string): string {
  return value.trim();
}

function normalizeFlat(value: string): string {
  return value.trim();
}

function isDuplicateHouseholdError(error: unknown): boolean {
  const pg = error as { code?: string; message?: string };
  return pg.code === '23505' || Boolean(pg.message?.includes('gfm_households_active_unique'));
}

async function mapHouseholdRow(row: HouseholdRowWithPrimary): Promise<GfmHousehold> {
  const communityName =
    row.gfm_communities?.name ?? (await fetchCommunityName(row.community_id));

  return {
    id: row.id,
    communityId: row.community_id,
    communityName,
    tower: row.tower,
    flatNumber: row.flat_number,
    primaryUserId: row.primary_user_id,
    primaryUserName: row.primary_user?.full_name ?? null,
    primaryUserMobile: row.primary_user?.mobile_number ?? null,
    primaryUserEmail: row.primary_user?.email ?? null,
    status: row.status as HouseholdStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const HOUSEHOLD_SELECT =
  'id, community_id, tower, flat_number, primary_user_id, status, created_at, updated_at, gfm_communities(name), primary_user:primary_user_id(full_name, mobile_number, email)';

export async function findActiveHousehold(
  communityId: string | null,
  tower: string,
  flatNumber: string,
): Promise<GfmHousehold | null> {
  if (!supabase) return null;

  const normalizedTower = normalizeTower(tower);
  const normalizedFlat = normalizeFlat(flatNumber);

  let query = supabase
    .from('gfm_households')
    .select(HOUSEHOLD_SELECT)
    .eq('status', 'ACTIVE')
    .ilike('tower', normalizedTower)
    .ilike('flat_number', normalizedFlat);

  if (communityId) {
    query = query.eq('community_id', communityId);
  } else {
    query = query.is('community_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn('[householdService] findActiveHousehold:', error.message);
    }
    return null;
  }

  return mapHouseholdRow(data as HouseholdRowWithPrimary);
}

export async function resolveOrCreateHouseholdForApprovedUser(user: {
  id: string;
  fullName: string;
  mobileNumber: string;
  communityId?: string | null;
  tower?: string | null;
  blockNumber: string;
  flatNo: string;
}): Promise<HouseholdResolveResult> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const tower = normalizeTower(user.tower ?? user.blockNumber);
  const flatNumber = normalizeFlat(user.flatNo);
  const communityId = user.communityId ?? null;
  const now = new Date().toISOString();

  const existing = await findActiveHousehold(communityId, tower, flatNumber);

  if (existing) {
    const { error: userError } = await supabase
      .from('gfm_users')
      .update({ household_id: existing.id, updated_at: now })
      .eq('id', user.id);

    if (userError) {
      throw new Error(getErrorMessage(userError, 'Could not link user to household.'));
    }

    return {
      household: existing,
      created: false,
      existingPrimaryName: existing.primaryUserName,
    };
  }

  const { data: created, error: createError } = await supabase
    .from('gfm_households')
    .insert({
      community_id: communityId,
      tower,
      flat_number: flatNumber,
      primary_user_id: user.id,
      status: 'ACTIVE',
      updated_at: now,
    })
    .select(HOUSEHOLD_SELECT)
    .single();

  if (createError || !created) {
    if (isDuplicateHouseholdError(createError)) {
      const retry = await findActiveHousehold(communityId, tower, flatNumber);
      if (retry) {
        await supabase
          .from('gfm_users')
          .update({ household_id: retry.id, updated_at: now })
          .eq('id', user.id);
        return {
          household: retry,
          created: false,
          existingPrimaryName: retry.primaryUserName,
        };
      }
    }
    throw new Error(getErrorMessage(createError, 'Could not create household.'));
  }

  const household = await mapHouseholdRow(created as HouseholdRowWithPrimary);

  const { error: userError } = await supabase
    .from('gfm_users')
    .update({ household_id: household.id, updated_at: now })
    .eq('id', user.id);

  if (userError) {
    throw new Error(getErrorMessage(userError, 'Could not link user to household.'));
  }

  return { household, created: true };
}

export async function fetchHouseholdForUser(
  userId: string,
  householdId: string | null | undefined,
): Promise<GfmHousehold | null> {
  if (!supabase || !householdId) return null;

  const { data: userRow } = await supabase
    .from('gfm_users')
    .select('household_id')
    .eq('id', userId)
    .maybeSingle();

  const ownedHouseholdId = (userRow as { household_id?: string | null } | null)?.household_id;
  if (!userRow) {
    return null;
  }
  if (ownedHouseholdId !== householdId) {
    return null;
  }

  const { data, error } = await supabase
    .from('gfm_households')
    .select(HOUSEHOLD_SELECT)
    .eq('id', householdId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapHouseholdRow(data as HouseholdRowWithPrimary);
}

export async function fetchHouseholdById(householdId: string): Promise<GfmHousehold | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('gfm_households')
    .select(HOUSEHOLD_SELECT)
    .eq('id', householdId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapHouseholdRow(data as HouseholdRowWithPrimary);
}

export async function fetchAllHouseholds(): Promise<GfmHousehold[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('gfm_households')
    .select(HOUSEHOLD_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[householdService] fetchAllHouseholds:', error.message);
    return [];
  }

  const rows = (data as HouseholdRowWithPrimary[]) ?? [];
  return Promise.all(rows.map(mapHouseholdRow));
}

export type HouseholdStats = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
};

export async function fetchHouseholdStats(): Promise<HouseholdStats> {
  const households = await fetchAllHouseholds();
  let active = 0;
  let inactive = 0;
  let suspended = 0;

  for (const h of households) {
    if (h.status === 'ACTIVE') active += 1;
    else if (h.status === 'SUSPENDED') suspended += 1;
    else inactive += 1;
  }

  return { total: households.length, active, inactive, suspended };
}

export async function updateHousehold(
  householdId: string,
  input: UpdateHouseholdInput,
): Promise<GfmHousehold> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const current = await fetchHouseholdById(householdId);
  if (!current) {
    throw new Error('Household not found.');
  }

  const nextTower = input.tower !== undefined ? normalizeTower(input.tower) : current.tower;
  const nextFlat =
    input.flatNumber !== undefined ? normalizeFlat(input.flatNumber) : current.flatNumber;
  const nextCommunityId =
    input.communityId !== undefined ? input.communityId : current.communityId;
  const nextStatus = input.status ?? current.status;

  if (nextStatus === 'ACTIVE') {
    const duplicate = await findActiveHousehold(nextCommunityId, nextTower, nextFlat);
    if (duplicate && duplicate.id !== householdId) {
      throw new Error(
        `An active household already exists for Tower ${nextTower} - ${nextFlat}.`,
      );
    }
  }

  const payload: Record<string, string | null> = {
    tower: nextTower,
    flat_number: nextFlat,
    community_id: nextCommunityId,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (input.primaryUserId !== undefined) {
    payload.primary_user_id = input.primaryUserId;
  }

  const { data, error } = await supabase
    .from('gfm_households')
    .update(payload)
    .eq('id', householdId)
    .select(HOUSEHOLD_SELECT)
    .single();

  if (error || !data) {
    if (isDuplicateHouseholdError(error)) {
      throw new Error(
        `An active household already exists for Tower ${nextTower} - ${nextFlat}.`,
      );
    }
    throw new Error(getErrorMessage(error, 'Could not update household.'));
  }

  return mapHouseholdRow(data as HouseholdRowWithPrimary);
}

export function formatHouseholdLabel(household: GfmHousehold | null | undefined): string | null {
  if (!household?.flatNumber || !household?.tower) return null;
  return `🏠 ${household.flatNumber} • Tower ${household.tower}`;
}

export function formatHouseholdLabelFromUser(user: {
  flatNo?: string;
  blockNumber?: string;
  tower?: string | null;
  household?: GfmHousehold | null;
} | null | undefined): string | null {
  if (!user) return null;
  const fromHousehold = formatHouseholdLabel(user.household ?? null);
  if (fromHousehold) return fromHousehold;
  const tower = user.tower ?? user.blockNumber;
  if (user.flatNo && tower) {
    return `🏠 ${user.flatNo} • Tower ${tower}`;
  }
  return null;
}

export async function previewHouseholdForUser(user: {
  communityId?: string | null;
  tower?: string | null;
  blockNumber: string;
  flatNo: string;
}): Promise<GfmHousehold | null> {
  const tower = normalizeTower(user.tower ?? user.blockNumber);
  const flatNumber = normalizeFlat(user.flatNo);
  return findActiveHousehold(user.communityId ?? null, tower, flatNumber);
}

/** Link (or create) household when household_id is missing — for users approved before Feature 2. */
export async function resolveHouseholdIdForUser(user: {
  id: string;
  accountStatus: string;
  isAdmin?: boolean;
  fullName?: string;
  mobileNumber?: string;
  communityId?: string | null;
  tower?: string | null;
  blockNumber: string;
  flatNo: string;
  householdId?: string | null;
  household?: GfmHousehold | null;
}): Promise<string | null> {
  if (user.householdId) {
    return user.householdId;
  }
  if (user.household?.id) {
    return user.household.id;
  }

  if (user.accountStatus !== 'ACTIVE' && !user.isAdmin) {
    return null;
  }

  if (!supabase) {
    return null;
  }

  const tower = normalizeTower(user.tower ?? user.blockNumber);
  const flatNumber = normalizeFlat(user.flatNo);
  if (!tower || !flatNumber) {
    return null;
  }

  let household = await findActiveHousehold(user.communityId ?? null, tower, flatNumber);

  // Older approved users have no household row — create one (same as admin approve flow)
  if (!household) {
    const now = new Date().toISOString();
    const { data: created, error: createError } = await supabase
      .from('gfm_households')
      .insert({
        community_id: user.communityId ?? null,
        tower,
        flat_number: flatNumber,
        primary_user_id: user.id,
        status: 'ACTIVE',
        updated_at: now,
      })
      .select(HOUSEHOLD_SELECT)
      .single();

    if (createError || !created) {
      if (isDuplicateHouseholdError(createError)) {
        household = await findActiveHousehold(user.communityId ?? null, tower, flatNumber);
      } else {
        console.warn(
          '[householdService] resolveHouseholdIdForUser create:',
          createError?.message ?? 'failed',
        );
        return null;
      }
    } else {
      household = await mapHouseholdRow(created as HouseholdRowWithPrimary);
    }
  }

  if (!household) {
    return null;
  }

  const { error } = await supabase
    .from('gfm_users')
    .update({ household_id: household.id, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    console.warn('[householdService] resolveHouseholdIdForUser link:', error.message);
  }

  return household.id;
}
