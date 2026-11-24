import { supabase } from '../lib/supabase';
import { calculateOrderTotal, mapOrderRowFromRow } from './orderService';
import { GfmOrder, GfmOrderRow, GfmUser, GfmUserRow, AccountStatus } from '../types/gfm';

export type AdminDashboardStats = {
  usersCount: number;
  ordersCount: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  categoriesCount: number;
  revenueToday: number;
  revenueTotal: number;
  paymentsCount: number;
};

export type AdminUserRow = GfmUser & {
  isAdmin?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
  loginCount?: number;
  accountStatus?: AccountStatus;
};

function mapUser(
  row: GfmUserRow & {
    created_at?: string;
    last_login_at?: string | null;
    login_count?: number | null;
  },
): AdminUserRow {
  return {
    id: row.id,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    blockNumber: row.block_number,
    flatNo: row.flat_no,
    avatarUrl: row.avatar_url ?? null,
    isAdmin: Boolean(row.is_admin),
    accountStatus: (row.account_status ?? 'ACTIVE') as AccountStatus,
    tower: row.tower ?? row.block_number,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? null,
    loginCount: Number(row.login_count ?? 0),
  };
}

export async function fetchAllOrders(): Promise<GfmOrder[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('gfm_orders')
    .select('*')
    .order('ordered_at', { ascending: false });

  if (error) {
    console.warn('[adminDashboard] fetchAllOrders:', error.message);
    return [];
  }

  return (data as GfmOrderRow[]).map(mapOrderRowFromRow);
}

export async function fetchAllUsers(): Promise<AdminUserRow[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('gfm_users')
    .select(
      'id, full_name, mobile_number, block_number, flat_no, avatar_url, is_admin, account_status, created_at, last_login_at, login_count',
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[adminDashboard] fetchAllUsers:', error.message);
    return [];
  }

  return (
    data as (GfmUserRow & {
      created_at?: string;
      last_login_at?: string | null;
      login_count?: number | null;
    })[]
  )
    .map(mapUser)
    .sort((a, b) => {
      const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bTime - aTime;
    });
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const empty: AdminDashboardStats = {
    usersCount: 0,
    ordersCount: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    activeOrders: 0,
    categoriesCount: 0,
    revenueToday: 0,
    revenueTotal: 0,
    paymentsCount: 0,
  };

  if (!supabase) {
    return empty;
  }

  const [usersRes, ordersRes, categoriesRes] = await Promise.all([
    supabase.from('gfm_users').select('id', { count: 'exact', head: true }),
    supabase.from('gfm_orders').select('*'),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
  ]);

  const orders = ((ordersRes.data ?? []) as GfmOrderRow[]).map(mapOrderRowFromRow);
  const today = new Date().toISOString().slice(0, 10);

  let revenueToday = 0;
  let revenueTotal = 0;
  let pendingOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let activeOrders = 0;

  for (const order of orders) {
    const total = calculateOrderTotal(order.items);
    revenueTotal += total;
    if (order.orderedAt?.startsWith(today)) {
      revenueToday += total;
    }

    const status = (order.status || 'placed').toLowerCase();
    if (status === 'delivered') {
      deliveredOrders += 1;
    } else if (status === 'cancelled') {
      cancelledOrders += 1;
    } else if (status === 'placed' || status === 'confirmed') {
      pendingOrders += 1;
      activeOrders += 1;
    } else {
      activeOrders += 1;
    }
  }

  return {
    usersCount: usersRes.count ?? 0,
    ordersCount: orders.length,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    activeOrders,
    categoriesCount: categoriesRes.count ?? 0,
    revenueToday,
    revenueTotal,
    paymentsCount: orders.filter(o => (o.status || '').toLowerCase() !== 'cancelled').length,
  };
}
