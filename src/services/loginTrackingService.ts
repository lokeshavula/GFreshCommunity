import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';

export type LoginRole = 'user' | 'admin';

export type LoginLog = {
  id: string;
  userId: string;
  fullName: string;
  mobileNumber: string;
  role: LoginRole;
  platform: string;
  createdAt: string;
};

type LoginLogRow = {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number: string;
  role: string;
  platform: string;
  created_at: string;
};

function mapLog(row: LoginLogRow): LoginLog {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    role: row.role === 'admin' ? 'admin' : 'user',
    platform: row.platform,
    createdAt: row.created_at,
  };
}

export async function recordLoginEvent(input: {
  userId: string;
  fullName: string;
  mobileNumber: string;
  role: LoginRole;
}): Promise<void> {
  if (!supabase) {
    return;
  }

  const now = new Date().toISOString();

  try {
    await supabase.from('gfm_login_logs').insert({
      user_id: input.userId,
      full_name: input.fullName,
      mobile_number: input.mobileNumber,
      role: input.role,
      platform: Platform.OS,
    });

    const { data } = await supabase
      .from('gfm_users')
      .select('login_count')
      .eq('id', input.userId)
      .maybeSingle();

    const currentCount = Number(
      (data as { login_count?: number | null } | null)?.login_count ?? 0,
    );

    await supabase
      .from('gfm_users')
      .update({
        last_login_at: now,
        login_count: currentCount + 1,
      })
      .eq('id', input.userId);
  } catch (error) {
    console.warn('[loginTracking] recordLoginEvent failed', error);
  }
}

export async function fetchRecentLoginLogs(limit = 40): Promise<LoginLog[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('gfm_login_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[loginTracking] fetchRecentLoginLogs:', error.message);
    return [];
  }

  return ((data ?? []) as LoginLogRow[]).map(mapLog);
}

export function formatLoginTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
