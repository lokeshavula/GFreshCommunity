import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import {
  clearCurrentUser,
  getCurrentUser,
  saveCurrentUser,
} from './sessionService';
import {
  AccountStatus,
  GfmUser,
  GfmUserRow,
  PendingUserRow,
  RegisterUserInput,
} from '../types/gfm';
import { getErrorMessage } from '../utils/errorMessage';
import { isAccountActive, isAccountPending, isAccountRejected, isAccountRestricted } from '../utils/authGuard';
import { fetchCommunityName } from './communityService';
import { fetchHouseholdForUser } from './householdService';

async function mapUserRow(row: GfmUserRow, communityName?: string | null): Promise<GfmUser> {
  const resolvedCommunity =
    communityName ?? (row.community_id ? await fetchCommunityName(row.community_id) : null);

  const status = (row.is_admin ? 'ACTIVE' : row.account_status ?? 'ACTIVE') as AccountStatus;

  return {
    id: row.id,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    blockNumber: row.block_number,
    flatNo: row.flat_no,
    avatarUrl: row.avatar_url ?? null,
    isAdmin: Boolean(row.is_admin),
    email: row.email ?? null,
    communityId: row.community_id ?? null,
    communityName: resolvedCommunity,
    tower: row.tower ?? row.block_number,
    householdId: row.household_id ?? null,
    accountStatus: status,
    approvedAt: row.approved_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    rejectedAt: row.rejected_at ?? null,
    createdAt: row.created_at,
  };
}

async function enrichUserWithHousehold(user: GfmUser): Promise<GfmUser> {
  if (!user.householdId) {
    return user;
  }

  try {
    const household = await fetchHouseholdForUser(user.id, user.householdId);
    return household ? { ...user, household } : user;
  } catch {
    return user;
  }
}

function assertSignInAllowed(user: GfmUser): void {
  if (user.isAdmin) {
    return;
  }

  if (isAccountPending(user.accountStatus)) {
    return;
  }

  if (isAccountRejected(user.accountStatus)) {
    return;
  }

  if (isAccountRestricted(user.accountStatus)) {
    return;
  }

  if (!isAccountActive(user.accountStatus)) {
    throw new Error('Your account is not active yet. Please contact support.');
  }
}

export async function signInWithMobile(
  mobileNumber: string,
  password: string,
): Promise<GfmUser> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('gfm_users')
    .select('*')
    .eq('mobile_number', mobileNumber.trim())
    .eq('password', password)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, 'Sign in failed. Please try again.'));
  }

  if (!data) {
    throw new Error('Invalid mobile number or password.');
  }

  const user = await enrichUserWithHousehold(await mapUserRow(data as GfmUserRow));
  assertSignInAllowed(user);
  await saveCurrentUser(user);

  if (isAccountActive(user.accountStatus) || user.isAdmin) {
    try {
      const { recordLoginEvent } = await import('./loginTrackingService');
      await recordLoginEvent({
        userId: user.id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        role: user.isAdmin ? 'admin' : 'user',
      });
    } catch {
      // Don't block login if tracking table is missing
    }
  }

  return user;
}

function isApprovalSchemaError(error: unknown): boolean {
  const pg = error as { code?: string; message?: string; details?: string; hint?: string };
  const combined = [pg.message, pg.details, pg.hint].filter(Boolean).join(' ');
  return (
    pg.code === 'PGRST204' ||
    pg.code === 'PGRST205' ||
    combined.includes('schema cache') ||
    combined.includes('Could not find') ||
    /account_status|community_id|tower|gfm_communities/i.test(combined)
  );
}

async function notifyRegistrationSubmitted(user: PendingUserRow): Promise<void> {
  if (!supabase) return;

  await supabase.from('gfm_notifications').insert({
    user_id: user.id,
    type: 'registration_submitted',
    title: 'Registration submitted',
    message: 'Your registration has been submitted. Our community admin will verify your details.',
    data: { accountStatus: 'PENDING_APPROVAL' },
  });

  const { data: admins } = await supabase
    .from('gfm_users')
    .select('id')
    .eq('is_admin', true);

  if (!admins || admins.length === 0) return;

  const inserts = admins.map((admin: { id: string }) => ({
    user_id: admin.id,
    type: 'new_registration_pending',
    title: 'New registration pending approval',
    message: `${user.fullName} (${user.tower ?? user.blockNumber} - ${user.flatNo}) has registered and is awaiting approval.`,
    data: {
      pendingUserId: user.id,
      fullName: user.fullName,
      blockNumber: user.blockNumber,
      flatNo: user.flatNo,
    },
  }));

  await supabase.from('gfm_notifications').insert(inserts);
}

export async function registerUser(input: RegisterUserInput): Promise<GfmUser> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const mobile = input.mobileNumber.trim();

  const { data: existing } = await supabase
    .from('gfm_users')
    .select('id')
    .eq('mobile_number', mobile)
    .maybeSingle();

  if (existing) {
    throw new Error('This mobile number is already registered. Please sign in instead.');
  }

  const tower = input.tower.trim() || input.blockNumber.trim();
  const communityId = input.communityId === 'local-default' ? null : input.communityId;

  let data: GfmUserRow | null = null;
  let usedLegacyRegistration = false;

  const fullInsert = await supabase
    .from('gfm_users')
    .insert({
      full_name: input.fullName.trim(),
      mobile_number: mobile,
      email: input.email?.trim() || null,
      community_id: communityId,
      tower,
      block_number: input.blockNumber.trim() || tower,
      flat_no: input.flatNo.trim(),
      password: input.password,
      account_status: 'PENDING_APPROVAL',
    })
    .select('*')
    .single();

  if (fullInsert.error) {
    if (isApprovalSchemaError(fullInsert.error)) {
      const legacyInsert = await supabase
        .from('gfm_users')
        .insert({
          full_name: input.fullName.trim(),
          mobile_number: mobile,
          block_number: input.blockNumber.trim() || tower,
          flat_no: input.flatNo.trim(),
          password: input.password,
        })
        .select('*')
        .single();

      if (legacyInsert.error || !legacyInsert.data) {
        throw new Error(
          getErrorMessage(
            legacyInsert.error ?? fullInsert.error,
            'Registration failed. Run supabase/gfm_user_approval.sql in Supabase SQL Editor, then try again.',
          ),
        );
      }

      data = legacyInsert.data as GfmUserRow;
      usedLegacyRegistration = true;
    } else {
      throw new Error(getErrorMessage(fullInsert.error, 'Registration failed. Please try again.'));
    }
  } else {
    data = fullInsert.data as GfmUserRow;
  }

  if (!data) {
    throw new Error('Registration failed. Please try again.');
  }

  const user = await mapUserRow(data);
  const communityName = await fetchCommunityName(communityId);
  const registeredUser: GfmUser = usedLegacyRegistration
    ? {
        ...user,
        email: input.email?.trim() || null,
        communityId,
        communityName: communityName ?? 'Adithya Capitol Heights',
        tower,
        accountStatus: 'PENDING_APPROVAL',
      }
    : user;

  await saveCurrentUser(registeredUser);

  const pendingUser: PendingUserRow = {
    ...registeredUser,
    createdAt: registeredUser.createdAt ?? new Date().toISOString(),
  };

  try {
    await notifyRegistrationSubmitted(pendingUser);
  } catch {
    // Don't block registration if notifications fail
  }

  return registeredUser;
}

export async function refreshUserFromServer(userId: string): Promise<GfmUser | null> {
  if (!supabase) {
    return getCurrentUser();
  }

  const { data, error } = await supabase
    .from('gfm_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return getCurrentUser();
  }

  const user = await enrichUserWithHousehold(await mapUserRow(data as GfmUserRow));
  await saveCurrentUser(user);
  return user;
}

export async function fetchGfmUser(userId: string): Promise<GfmUser | null> {
  return refreshUserFromServer(userId);
}

export async function updateDeliveryAddress(
  userId: string,
  blockNumber: string,
  flatNo: string,
): Promise<GfmUser> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const block = blockNumber.trim();
  const flat = flatNo.trim();

  if (!block || !flat) {
    throw new Error('Please enter block number and flat number.');
  }

  const { data, error } = await supabase
    .from('gfm_users')
    .update({
      block_number: block,
      flat_no: flat,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not update address.'));
  }

  const user = await mapUserRow(data as GfmUserRow);
  await saveCurrentUser(user);
  return user;
}

export async function updateProfile(
  userId: string,
  input: {
    fullName: string;
    mobileNumber: string;
    blockNumber: string;
    flatNo: string;
    avatarUrl?: string | null;
  },
): Promise<GfmUser> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const fullName = input.fullName.trim();
  const mobileNumber = input.mobileNumber.trim();
  const blockNumber = input.blockNumber.trim();
  const flatNo = input.flatNo.trim();

  if (!fullName || !mobileNumber || !blockNumber || !flatNo) {
    throw new Error('Please fill all profile fields.');
  }

  if (!/^\d{10}$/.test(mobileNumber)) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }

  const { data: existing } = await supabase
    .from('gfm_users')
    .select('id')
    .eq('mobile_number', mobileNumber)
    .neq('id', userId)
    .maybeSingle();

  if (existing) {
    throw new Error('This mobile number is already used by another account.');
  }

  const payload: Record<string, string | null> = {
    full_name: fullName,
    mobile_number: mobileNumber,
    block_number: blockNumber,
    flat_no: flatNo,
  };

  if (input.avatarUrl !== undefined) {
    payload.avatar_url = input.avatarUrl;
  }

  const { data, error } = await supabase
    .from('gfm_users')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not update profile.'));
  }

  const user = await mapUserRow(data as GfmUserRow);
  await saveCurrentUser(user);
  return user;
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  if (!currentPassword.trim() || !newPassword.trim()) {
    throw new Error('Please fill all password fields.');
  }

  if (newPassword.trim().length < 4) {
    throw new Error('New password must be at least 4 characters.');
  }

  const { data, error } = await supabase
    .from('gfm_users')
    .select('id, password')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not verify current password.'));
  }

  if ((data as { password: string }).password !== currentPassword) {
    throw new Error('Current password is incorrect.');
  }

  const { error: updateError } = await supabase
    .from('gfm_users')
    .update({ password: newPassword.trim() })
    .eq('id', userId);

  if (updateError) {
    throw new Error(getErrorMessage(updateError, 'Could not update password.'));
  }
}

export { getCurrentUser };

export async function signOut(): Promise<void> {
  await clearCurrentUser();
}

export async function requireActiveUser(): Promise<GfmUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Please sign in to continue.');
  }
  if (!user.isAdmin && !isAccountActive(user.accountStatus)) {
    throw new Error('Your account is not approved for shopping yet.');
  }
  return user;
}
