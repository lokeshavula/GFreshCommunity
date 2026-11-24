import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import {
  AddHouseholdChildMemberInput,
  AddHouseholdMemberByMobileInput,
  GfmHouseholdMember,
  GfmHouseholdMemberRow,
  GfmUserRow,
  HouseholdMemberRole,
  UpdateHouseholdMemberInput,
} from '../types/gfm';
import { getErrorMessage } from '../utils/errorMessage';
import { fetchHouseholdById, resolveHouseholdIdForUser, updateHousehold } from './householdService';
import type { GfmUser } from '../types/gfm';

const MEMBER_SELECT =
  'id, household_id, user_id, display_name, mobile_number, role, can_order, can_manage_members, status, added_by, created_at, updated_at';

function normalizeMobile(mobileNumber: string): string {
  const digits = mobileNumber.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function mapMemberRow(row: GfmHouseholdMemberRow): GfmHouseholdMember {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id ?? null,
    displayName: row.display_name,
    mobileNumber: row.mobile_number ?? null,
    role: row.role,
    canOrder: row.can_order,
    canManageMembers: row.can_manage_members,
    status: row.status,
    addedBy: row.added_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function defaultPermissionsForRole(role: HouseholdMemberRole): {
  canOrder: boolean;
  canManageMembers: boolean;
} {
  if (role === 'PRIMARY') {
    return { canOrder: true, canManageMembers: true };
  }
  if (role === 'CHILD') {
    return { canOrder: false, canManageMembers: false };
  }
  return { canOrder: true, canManageMembers: false };
}

export function formatMemberRoleLabel(role: HouseholdMemberRole): string {
  if (role === 'PRIMARY') return 'Primary';
  if (role === 'CHILD') return 'Child';
  return 'Adult';
}

export async function fetchHouseholdMembers(
  householdId: string,
  activeOnly = true,
): Promise<GfmHouseholdMember[]> {
  if (!supabase) return [];

  let query = supabase
    .from('gfm_household_members')
    .select(MEMBER_SELECT)
    .eq('household_id', householdId)
    .order('role', { ascending: true })
    .order('created_at', { ascending: true });

  if (activeOnly) {
    query = query.eq('status', 'ACTIVE');
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[householdMemberService] fetchHouseholdMembers:', error.message);
    throw new Error(getErrorMessage(error, 'Could not load family members.'));
  }

  return ((data as GfmHouseholdMemberRow[]) ?? []).map(mapMemberRow);
}

export async function fetchMemberForUser(
  userId: string,
  householdId: string,
): Promise<GfmHouseholdMember | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('gfm_household_members')
    .select(MEMBER_SELECT)
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMemberRow(data as GfmHouseholdMemberRow);
}

export async function canManageHouseholdMembers(
  actorUserId: string,
  householdId: string,
): Promise<boolean> {
  const member = await fetchMemberForUser(actorUserId, householdId);
  if (member?.canManageMembers || member?.role === 'PRIMARY') {
    return true;
  }

  const household = await fetchHouseholdById(householdId);
  return household?.primaryUserId === actorUserId;
}

export async function canPlaceHouseholdOrders(
  userId: string,
  householdId: string,
): Promise<boolean> {
  const member = await fetchMemberForUser(userId, householdId);
  if (member) {
    return member.canOrder;
  }

  const household = await fetchHouseholdById(householdId);
  return household?.primaryUserId === userId;
}

async function findUserByMobile(mobileNumber: string): Promise<GfmUserRow | null> {
  if (!supabase) return null;

  const mobile = normalizeMobile(mobileNumber);
  const { data, error } = await supabase
    .from('gfm_users')
    .select('*')
    .eq('mobile_number', mobile)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as GfmUserRow;
}

export async function syncMemberOnApproval(input: {
  userId: string;
  householdId: string;
  fullName: string;
  mobileNumber: string;
  isPrimary: boolean;
}): Promise<GfmHouseholdMember | null> {
  if (!supabase) return null;

  const role: HouseholdMemberRole = input.isPrimary ? 'PRIMARY' : 'ADULT';
  const perms = defaultPermissionsForRole(role);
  const now = new Date().toISOString();

  const existing = await fetchMemberForUser(input.userId, input.householdId);
  if (existing) {
    return existing;
  }

  if (input.isPrimary) {
    await demoteExistingPrimary(input.householdId, now);
  }

  const { data, error } = await supabase
    .from('gfm_household_members')
    .insert({
      household_id: input.householdId,
      user_id: input.userId,
      display_name: input.fullName,
      mobile_number: input.mobileNumber,
      role,
      can_order: perms.canOrder,
      can_manage_members: perms.canManageMembers,
      status: 'ACTIVE',
      updated_at: now,
    })
    .select(MEMBER_SELECT)
    .single();

  if (error || !data) {
    console.warn('[householdMemberService] syncMemberOnApproval:', error?.message);
    return null;
  }

  return mapMemberRow(data as GfmHouseholdMemberRow);
}

async function demoteExistingPrimary(householdId: string, now: string): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('gfm_household_members')
    .update({
      role: 'ADULT',
      can_manage_members: false,
      can_order: true,
      updated_at: now,
    })
    .eq('household_id', householdId)
    .eq('role', 'PRIMARY')
    .eq('status', 'ACTIVE');
}

export async function addHouseholdMemberByMobile(
  input: AddHouseholdMemberByMobileInput,
): Promise<GfmHouseholdMember> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const household = await fetchHouseholdById(input.householdId);
  if (!household) {
    throw new Error('Household not found.');
  }

  if (input.addedByUserId) {
    const allowed = await canManageHouseholdMembers(input.addedByUserId, input.householdId);
    if (!allowed) {
      throw new Error('You do not have permission to manage household members.');
    }
  }

  const user = await findUserByMobile(input.mobileNumber);
  if (!user) {
    throw new Error('No registered user found for this mobile number.');
  }

  if (user.account_status !== 'ACTIVE' && !user.is_admin) {
    throw new Error('This user is not active yet. They must be approved before joining a household.');
  }

  const existing = await fetchMemberForUser(user.id, input.householdId);
  if (existing) {
    throw new Error(`${user.full_name} is already a member of this household.`);
  }

  if (user.household_id && user.household_id !== input.householdId) {
    throw new Error(`${user.full_name} is already linked to another household.`);
  }

  const perms = defaultPermissionsForRole(input.role);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gfm_household_members')
    .insert({
      household_id: input.householdId,
      user_id: user.id,
      display_name: user.full_name,
      mobile_number: user.mobile_number,
      role: input.role,
      can_order: perms.canOrder,
      can_manage_members: perms.canManageMembers,
      status: 'ACTIVE',
      added_by: input.addedByUserId ?? null,
      updated_at: now,
    })
    .select(MEMBER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not add household member.'));
  }

  await supabase
    .from('gfm_users')
    .update({ household_id: input.householdId, updated_at: now })
    .eq('id', user.id);

  return mapMemberRow(data as GfmHouseholdMemberRow);
}

export async function addHouseholdChildMember(
  input: AddHouseholdChildMemberInput,
): Promise<GfmHouseholdMember> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const name = input.displayName.trim();
  if (!name) {
    throw new Error('Enter a name for the child member.');
  }

  if (input.addedByUserId) {
    const allowed = await canManageHouseholdMembers(input.addedByUserId, input.householdId);
    if (!allowed) {
      throw new Error('You do not have permission to manage household members.');
    }
  }

  const perms = defaultPermissionsForRole('CHILD');
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gfm_household_members')
    .insert({
      household_id: input.householdId,
      user_id: null,
      display_name: name,
      mobile_number: null,
      role: 'CHILD',
      can_order: input.canOrder ?? perms.canOrder,
      can_manage_members: false,
      status: 'ACTIVE',
      added_by: input.addedByUserId ?? null,
      updated_at: now,
    })
    .select(MEMBER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not add child member.'));
  }

  return mapMemberRow(data as GfmHouseholdMemberRow);
}

export async function updateHouseholdMember(
  memberId: string,
  input: UpdateHouseholdMemberInput,
): Promise<GfmHouseholdMember> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const { data: current, error: fetchError } = await supabase
    .from('gfm_household_members')
    .select(MEMBER_SELECT)
    .eq('id', memberId)
    .maybeSingle();

  if (fetchError || !current) {
    throw new Error('Household member not found.');
  }

  const row = current as GfmHouseholdMemberRow;
  if (row.status !== 'ACTIVE') {
    throw new Error('This member has already been removed.');
  }

  const nextRole = input.role ?? row.role;
  if (nextRole === 'PRIMARY') {
    throw new Error('Use set primary to change the primary resident.');
  }

  const defaults = defaultPermissionsForRole(nextRole);
  const payload: Record<string, string | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.displayName !== undefined) {
    payload.display_name = input.displayName.trim();
  }
  if (input.role !== undefined) {
    payload.role = input.role;
    payload.can_order = input.canOrder ?? defaults.canOrder;
    payload.can_manage_members = input.canManageMembers ?? defaults.canManageMembers;
  } else {
    if (input.canOrder !== undefined) payload.can_order = input.canOrder;
    if (input.canManageMembers !== undefined) {
      payload.can_manage_members = input.canManageMembers;
    }
  }

  const { data, error } = await supabase
    .from('gfm_household_members')
    .update(payload)
    .eq('id', memberId)
    .select(MEMBER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not update member.'));
  }

  return mapMemberRow(data as GfmHouseholdMemberRow);
}

export async function setPrimaryHouseholdMember(
  memberId: string,
  actorUserId?: string | null,
): Promise<GfmHouseholdMember> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const { data: current, error: fetchError } = await supabase
    .from('gfm_household_members')
    .select(MEMBER_SELECT)
    .eq('id', memberId)
    .maybeSingle();

  if (fetchError || !current) {
    throw new Error('Household member not found.');
  }

  const row = current as GfmHouseholdMemberRow;
  if (row.status !== 'ACTIVE') {
    throw new Error('Cannot set a removed member as primary.');
  }
  if (!row.user_id) {
    throw new Error('Primary resident must have a registered app account.');
  }

  if (actorUserId) {
    const allowed = await canManageHouseholdMembers(actorUserId, row.household_id);
    if (!allowed) {
      throw new Error('You do not have permission to change the primary resident.');
    }
  }

  const now = new Date().toISOString();
  await demoteExistingPrimary(row.household_id, now);

  const { data, error } = await supabase
    .from('gfm_household_members')
    .update({
      role: 'PRIMARY',
      can_order: true,
      can_manage_members: true,
      updated_at: now,
    })
    .eq('id', memberId)
    .select(MEMBER_SELECT)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not set primary member.'));
  }

  await updateHousehold(row.household_id, { primaryUserId: row.user_id });

  return mapMemberRow(data as GfmHouseholdMemberRow);
}

export async function removeHouseholdMember(
  memberId: string,
  actorUserId?: string | null,
): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const { data: current, error: fetchError } = await supabase
    .from('gfm_household_members')
    .select(MEMBER_SELECT)
    .eq('id', memberId)
    .maybeSingle();

  if (fetchError || !current) {
    throw new Error('Household member not found.');
  }

  const row = current as GfmHouseholdMemberRow;
  if (row.role === 'PRIMARY') {
    throw new Error('Set another member as primary before removing the primary resident.');
  }

  if (actorUserId) {
    const allowed = await canManageHouseholdMembers(actorUserId, row.household_id);
    if (!allowed) {
      throw new Error('You do not have permission to remove household members.');
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('gfm_household_members')
    .update({ status: 'REMOVED', updated_at: now })
    .eq('id', memberId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Could not remove member.'));
  }

  if (row.user_id) {
    await supabase
      .from('gfm_users')
      .update({ household_id: null, updated_at: now })
      .eq('id', row.user_id)
      .eq('household_id', row.household_id);
  }
}

export async function ensureHouseholdMemberForUser(
  user: { id: string; fullName: string; mobileNumber: string },
  householdId: string,
): Promise<GfmHouseholdMember | null> {
  const existing = await fetchMemberForUser(user.id, householdId);
  if (existing) {
    return existing;
  }

  const household = await fetchHouseholdById(householdId);
  const isPrimary = household?.primaryUserId === user.id;

  return syncMemberOnApproval({
    userId: user.id,
    householdId,
    fullName: user.fullName,
    mobileNumber: user.mobileNumber,
    isPrimary: Boolean(isPrimary),
  });
}

export type UserHouseholdContext = {
  user: GfmUser;
  householdId: string | null;
  canManageMembers: boolean;
};

export async function prepareUserHouseholdContext(
  user: GfmUser,
  fetchUser?: (userId: string) => Promise<GfmUser | null>,
): Promise<UserHouseholdContext> {
  let current = user;
  let householdId = user.householdId ?? user.household?.id ?? null;

  if (!householdId) {
    householdId = await resolveHouseholdIdForUser(user);
    if (householdId) {
      if (fetchUser) {
        const refreshed = await fetchUser(user.id);
        if (refreshed) {
          current = refreshed;
          householdId = refreshed.householdId ?? refreshed.household?.id ?? householdId;
        }
      } else {
        current = { ...current, householdId };
      }
    }
  }

  if (householdId && current.accountStatus === 'ACTIVE') {
    try {
      await ensureHouseholdMemberForUser(current, householdId);
    } catch (error) {
      console.warn('[householdMemberService] ensureHouseholdMemberForUser:', error);
    }
  }

  if (fetchUser) {
    const latest = await fetchUser(current.id);
    if (latest) {
      current = latest;
      householdId = latest.householdId ?? latest.household?.id ?? householdId;
    }
  }

  let canManageMembers = false;
  if (householdId) {
    canManageMembers = await canManageHouseholdMembers(current.id, householdId);
  }

  return { user: current, householdId, canManageMembers };
}
