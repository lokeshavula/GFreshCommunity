import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import { AdminUser, GfmUserRow } from '../types/gfm';
import { getErrorMessage } from '../utils/errorMessage';
import {
  clearCurrentAdmin,
  getCurrentAdmin,
  saveCurrentAdmin,
} from './adminSessionService';

function normalizeMobile(mobileNumber: string): string {
  const digits = mobileNumber.replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export async function signInAdmin(
  mobileNumber: string,
  password: string,
): Promise<AdminUser> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const mobile = normalizeMobile(mobileNumber);
  const pass = password.trim();

  if (!mobile || !pass) {
    throw new Error('Enter mobile number and password.');
  }

  const { data, error } = await supabase
    .from('gfm_users')
    .select('*')
    .eq('mobile_number', mobile)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, 'Admin sign in failed.'));
  }

  if (!data) {
    throw new Error('No account found for this mobile number. Run supabase/RUN_THIS.sql first.');
  }

  const row = data as GfmUserRow;

  if (row.password !== pass) {
    throw new Error('Incorrect password. Reset it with RUN_THIS.sql (Admin@123).');
  }

  if (!row.is_admin) {
    throw new Error(
      'This account is not an admin. Run RUN_THIS.sql to set is_admin = true for 8008216667.',
    );
  }

  const admin: AdminUser = {
    id: row.id,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
  };

  await saveCurrentAdmin(admin);

  const { recordLoginEvent } = await import('./loginTrackingService');
  await recordLoginEvent({
    userId: admin.id,
    fullName: admin.fullName,
    mobileNumber: admin.mobileNumber,
    role: 'admin',
  });

  return admin;
}

export async function signOutAdmin(): Promise<void> {
  await clearCurrentAdmin();
}

export { getCurrentAdmin };
