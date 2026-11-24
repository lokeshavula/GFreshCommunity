import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import {
  AccountStatus,
  GfmUser,
  GfmUserRow,
  PendingUserRow,
} from '../types/gfm';
import { getErrorMessage } from '../utils/errorMessage';
import { fetchCommunityName } from './communityService';
import { resolveOrCreateHouseholdForApprovedUser } from './householdService';
import { syncMemberOnApproval } from './householdMemberService';

type UserWithCommunity = GfmUserRow & {
  gfm_communities?: { name: string } | null;
};

function mapPendingUser(row: UserWithCommunity): PendingUserRow {
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
    communityName: row.gfm_communities?.name ?? null,
    tower: row.tower ?? row.block_number,
    accountStatus: (row.account_status ?? 'PENDING_APPROVAL') as AccountStatus,
    approvedAt: row.approved_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    rejectedAt: row.rejected_at ?? null,
    createdAt: row.created_at,
  };
}

async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return;

  await supabase.from('gfm_notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    data,
  });
}

async function notifyAdminsNewRegistration(user: PendingUserRow): Promise<void> {
  if (!supabase) return;

  const { data: admins } = await supabase
    .from('gfm_users')
    .select('id')
    .eq('is_admin', true);

  const adminIds = ((admins as { id: string }[]) ?? []).map(row => row.id);
  if (adminIds.length === 0) return;

  const towerFlat = `${user.tower ?? user.blockNumber} · Flat ${user.flatNo}`;
  const community = user.communityName ?? 'Community';

  await Promise.all(
    adminIds.map(adminId =>
      createNotification(
        adminId,
        'registration_pending',
        'New resident registration',
        `${user.fullName} registered for ${community}, ${towerFlat}. Review required.`,
        { userId: user.id, screen: 'AdminUserReview' },
      ),
    ),
  );
}

async function recordApproval(
  userId: string,
  status: string,
  reviewedBy: string,
  reason?: string,
): Promise<void> {
  if (!supabase) return;

  await supabase.from('gfm_approval_records').insert({
    user_id: userId,
    status,
    reviewed_by: reviewedBy,
    reason: reason ?? null,
    reviewed_at: new Date().toISOString(),
  });
}

export async function fetchPendingUsers(): Promise<PendingUserRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('gfm_users')
    .select(
      'id, full_name, mobile_number, block_number, flat_no, avatar_url, is_admin, email, community_id, tower, account_status, approved_at, rejection_reason, rejected_at, created_at, gfm_communities(name)',
    )
    .in('account_status', ['PENDING_APPROVAL', 'REGISTERED'])
    .eq('is_admin', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[approvalService] fetchPendingUsers:', error.message);
    return [];
  }

  return ((data as UserWithCommunity[]) ?? []).map(mapPendingUser);
}

export async function fetchUsersByApprovalStatus(
  status: AccountStatus | AccountStatus[],
): Promise<PendingUserRow[]> {
  if (!supabase) return [];

  const statuses = Array.isArray(status) ? status : [status];

  const { data, error } = await supabase
    .from('gfm_users')
    .select(
      'id, full_name, mobile_number, block_number, flat_no, avatar_url, is_admin, email, community_id, tower, account_status, approved_at, rejection_reason, rejected_at, created_at, gfm_communities(name)',
    )
    .in('account_status', statuses)
    .eq('is_admin', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[approvalService] fetchUsersByApprovalStatus:', error.message);
    return [];
  }

  return ((data as UserWithCommunity[]) ?? []).map(mapPendingUser);
}

export async function fetchUserForReview(userId: string): Promise<PendingUserRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('gfm_users')
    .select(
      'id, full_name, mobile_number, block_number, flat_no, avatar_url, is_admin, email, community_id, tower, account_status, approved_at, rejection_reason, rejected_at, created_at, gfm_communities(name)',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapPendingUser(data as UserWithCommunity);
}

export async function approveUser(
  userId: string,
  adminId: string,
): Promise<GfmUser> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const pending = await fetchUserForReview(userId);
  if (!pending) {
    throw new Error('User not found.');
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gfm_users')
    .update({
      account_status: 'ACTIVE',
      approved_at: now,
      approved_by: adminId,
      rejection_reason: null,
      rejected_at: null,
      updated_at: now,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not approve user.'));
  }

  const row = data as GfmUserRow;
  let householdResult = null;

  try {
    householdResult = await resolveOrCreateHouseholdForApprovedUser({
      id: row.id,
      fullName: row.full_name,
      mobileNumber: row.mobile_number,
      communityId: row.community_id ?? null,
      tower: row.tower ?? row.block_number,
      blockNumber: row.block_number,
      flatNo: row.flat_no,
    });
  } catch (householdError) {
    throw new Error(getErrorMessage(householdError, 'User approved but household setup failed.'));
  }

  await syncMemberOnApproval({
    userId: row.id,
    householdId: householdResult.household.id,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    isPrimary: householdResult.created,
  });

  await recordApproval(userId, 'ACTIVE', adminId);
  await createNotification(
    userId,
    'account_approved',
    '🎉 Welcome to G Fresh Mart!',
    'Your account has been approved. You can now start shopping for fresh vegetables, groceries, dairy and more.',
    {
      accountStatus: 'ACTIVE',
      householdId: householdResult.household.id,
    },
  );

  const communityName = await fetchCommunityName(row.community_id);
  const refreshed = await supabase
    .from('gfm_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const finalRow = (refreshed.data as GfmUserRow | null) ?? row;

  return {
    id: finalRow.id,
    fullName: finalRow.full_name,
    mobileNumber: finalRow.mobile_number,
    blockNumber: finalRow.block_number,
    flatNo: finalRow.flat_no,
    avatarUrl: finalRow.avatar_url ?? null,
    isAdmin: Boolean(finalRow.is_admin),
    email: finalRow.email ?? null,
    communityId: finalRow.community_id ?? null,
    communityName,
    tower: finalRow.tower ?? finalRow.block_number,
    householdId: finalRow.household_id ?? householdResult.household.id,
    household: householdResult.household,
    accountStatus: 'ACTIVE',
    approvedAt: now,
    rejectionReason: null,
    rejectedAt: null,
    createdAt: finalRow.created_at,
  };
}

export async function rejectUser(
  userId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error('Please provide a rejection reason.');
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('gfm_users')
    .update({
      account_status: 'REJECTED',
      rejection_reason: trimmedReason,
      rejected_at: now,
      updated_at: now,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Could not reject user.'));
  }

  await recordApproval(userId, 'REJECTED', adminId, trimmedReason);
  await createNotification(
    userId,
    'account_rejected',
    'Registration not approved',
    `Your registration could not be approved. Reason: ${trimmedReason}`,
    { accountStatus: 'REJECTED', reason: trimmedReason },
  );
}

export async function requestMoreInfo(
  userId: string,
  adminId: string,
  message: string,
): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error('Please enter what information you need.');
  }

  await supabase
    .from('gfm_users')
    .update({
      account_status: 'PENDING_APPROVAL',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  await recordApproval(userId, 'REQUEST_INFO', adminId, trimmed);
  await createNotification(
    userId,
    'account_info_requested',
    'More information needed',
    trimmed,
    { accountStatus: 'PENDING_APPROVAL' },
  );
}

export async function notifyRegistrationSubmitted(user: PendingUserRow): Promise<void> {
  await createNotification(
    user.id,
    'registration_submitted',
    'Registration submitted',
    'Your registration has been submitted. Our community admin will verify your details.',
    { accountStatus: 'PENDING_APPROVAL' },
  );
  await notifyAdminsNewRegistration(user);
}

export async function fetchPendingApprovalCount(): Promise<number> {
  const pending = await fetchPendingUsers();
  return pending.length;
}
