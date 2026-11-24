import type { AccountStatus, GfmUser } from '../types/gfm';
import type { RootStackParamList } from '../navigation/AppNavigator';

export function isAccountActive(status: AccountStatus | undefined): boolean {
  if (!status) return true;
  return status === 'ACTIVE' || status === 'APPROVED';
}

export function isAccountPending(status: AccountStatus | undefined): boolean {
  if (!status) return false;
  return status === 'PENDING_APPROVAL' || status === 'REGISTERED';
}

export function isAccountRejected(status: AccountStatus | undefined): boolean {
  return status === 'REJECTED';
}

export function isAccountRestricted(status: AccountStatus | undefined): boolean {
  return status === 'SUSPENDED' || status === 'BLOCKED' || status === 'DEACTIVATED';
}

export function getRouteForUser(user: GfmUser | null): keyof RootStackParamList {
  if (!user) {
    return 'Login';
  }

  if (user.isAdmin) {
    return 'AdminDashboard';
  }

  if (isAccountPending(user.accountStatus)) {
    return 'PendingApproval';
  }

  if (isAccountRejected(user.accountStatus)) {
    return 'AccountRejected';
  }

  if (isAccountRestricted(user.accountStatus)) {
    return 'AccountSuspended';
  }

  if (isAccountActive(user.accountStatus)) {
    return 'Home';
  }

  return 'PendingApproval';
}

export function assertShoppingAccess(user: GfmUser | null): void {
  if (!user) {
    throw new Error('Please sign in to continue.');
  }

  if (user.isAdmin) {
    return;
  }

  if (isAccountPending(user.accountStatus)) {
    throw new Error('Your account is awaiting approval. You cannot shop yet.');
  }

  if (isAccountRejected(user.accountStatus)) {
    throw new Error('Your registration was not approved.');
  }

  if (isAccountRestricted(user.accountStatus)) {
    throw new Error('Your account is suspended. Contact community support.');
  }

  if (!isAccountActive(user.accountStatus)) {
    throw new Error('Your account is not active yet.');
  }
}
