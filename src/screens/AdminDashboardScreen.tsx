import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { AppStatusBar } from '../components/AppStatusBar';
import { AdminHouseholdsTab } from '../components/admin/AdminHouseholdsTab';
import { AdminApprovalsTab } from '../components/admin/AdminApprovalsTab';
import { AdminAccountTab } from '../components/admin/AdminAccountTab';
import { AdminHomeTab } from '../components/admin/AdminHomeTab';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminPaymentsTab } from '../components/admin/AdminPaymentsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminBulkOrdersTab } from '../components/admin/AdminBulkOrdersTab';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getCurrentAdmin, signOutAdmin } from '../services/adminService';
import {
  AdminDashboardStats,
  AdminUserRow,
  fetchAdminDashboardStats,
  fetchAllOrders,
  fetchAllUsers,
} from '../services/adminDashboardService';
import {
  AdminBulkOrder,
  AdminBulkSummaryStats,
  fetchAdminBulkOrders,
} from '../services/adminBulkOrderService';
import { fetchRecentLoginLogs, LoginLog } from '../services/loginTrackingService';
import { fetchUsersByApprovalStatus } from '../services/approvalService';
import {
  fetchAllHouseholds,
  fetchHouseholdStats,
  HouseholdStats,
} from '../services/householdService';
import { signOut } from '../services/userService';
import { updateOrderStatus } from '../services/orderService';
import { PendingUserRow, GfmOrder, OrderStatus, GfmHousehold } from '../types/gfm';
import { colors } from '../theme/colors';
import { CONTENT_MAX, useBottomChromeInset, useResponsiveLayout } from '../utils/layout';

type AdminDashboardNavigation = NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;
type AdminTab = 'home' | 'bulk_orders' | 'orders' | 'payments' | 'account' | 'users';
type UsersSubTab = 'approvals' | 'all' | 'households';

const EMPTY_STATS: AdminDashboardStats = {
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

export function AdminDashboardScreen() {
  const navigation = useNavigation<AdminDashboardNavigation>();
  const insets = useSafeAreaInsets();
  const { deviceSize } = useResponsiveLayout();
  const chromeInset = useBottomChromeInset(
    deviceSize === 'largeTablet' ? CONTENT_MAX.full : CONTENT_MAX.wide,
  );
  const [activeTab, setActiveTab] = useState<AdminTab>('home');
  const [usersSubTab, setUsersSubTab] = useState<UsersSubTab>('approvals');
  const [adminName, setAdminName] = useState('Admin');
  const [adminMobile, setAdminMobile] = useState('');
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUserRow[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<PendingUserRow[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<PendingUserRow[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<PendingUserRow[]>([]);
  const [households, setHouseholds] = useState<GfmHousehold[]>([]);
  const [householdStats, setHouseholdStats] = useState<HouseholdStats>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
  });
  const [orders, setOrders] = useState<GfmOrder[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [bulkOrders, setBulkOrders] = useState<AdminBulkOrder[]>([]);
  const [bulkStats, setBulkStats] = useState<AdminBulkSummaryStats>({
    totalDeals: 0,
    confirmedCount: 0,
    proposedCount: 0,
    totalUnitsClubbed: 0,
    totalWholesaleValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const admin = await getCurrentAdmin();
      if (!admin) {
        navigation.replace('Login');
        return;
      }
      setAdminName(admin.fullName);
      setAdminMobile(admin.mobileNumber);

      const [
        nextStats,
        nextUsers,
        nextOrders,
        nextLogs,
        pending,
        approved,
        rejected,
        suspended,
        nextHouseholds,
        nextHouseholdStats,
        nextBulk,
      ] = await Promise.all([
        fetchAdminDashboardStats(),
        fetchAllUsers(),
        fetchAllOrders(),
        fetchRecentLoginLogs(50),
        fetchUsersByApprovalStatus(['PENDING_APPROVAL', 'REGISTERED']),
        fetchUsersByApprovalStatus(['ACTIVE', 'APPROVED']),
        fetchUsersByApprovalStatus('REJECTED'),
        fetchUsersByApprovalStatus(['SUSPENDED', 'BLOCKED', 'DEACTIVATED']),
        fetchAllHouseholds(),
        fetchHouseholdStats(),
        fetchAdminBulkOrders(),
      ]);
      setStats(nextStats);
      setUsers(nextUsers);
      setOrders(nextOrders);
      setLoginLogs(nextLogs);
      setPendingUsers(pending);
      setApprovedUsers(approved);
      setRejectedUsers(rejected);
      setSuspendedUsers(suspended);
      setHouseholds(nextHouseholds);
      setHouseholdStats(nextHouseholdStats);
      if (nextBulk) {
        setBulkOrders(nextBulk.orders);
        setBulkStats(nextBulk.stats);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const handleLogout = async () => {
    await signOutAdmin();
    await signOut();
    navigation.replace('Login');
  };

  const handleUpdateStatus = async (order: GfmOrder, status: OrderStatus) => {
    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, status);
      if (updated) {
        setOrders(current => current.map(item => (item.id === order.id ? updated : item)));
        const nextStats = await fetchAdminDashboardStats();
        setStats(nextStats);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const bottomPadding = 120;

  const darkChrome =
    activeTab === 'home' || activeTab === 'users' || activeTab === 'payments';

  return (
    <View className="flex-1" style={styles.screen}>
      <AppStatusBar lightContent={darkChrome} />
      <View
        style={{
          height: insets.top,
          backgroundColor: darkChrome ? colors.primaryDark : colors.surface,
        }}
      />

      {isLoading && activeTab === 'home' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="mt-3 text-sm text-slate-500">Loading dashboard…</Text>
        </View>
      ) : null}

      {!isLoading && activeTab === 'home' ? (
        <AdminHomeTab
          adminName={adminName}
          bottomPadding={bottomPadding}
          orders={orders}
          pendingUsersCount={pendingUsers.length}
          stats={stats}
          onOpenDailyPrices={() => navigation.navigate('AdminDailyPrices')}
          onOpenDemandPoll={() => navigation.navigate('AdminDemandPoll')}
          onOpenFreshArrivals={() => navigation.navigate('AdminFreshArrivals')}
          onOpenProductImages={() => navigation.navigate('AdminProductImages')}
          onOpenTab={setActiveTab}
          onViewStore={() => navigation.navigate('Home', { fromAdmin: true })}
        />
      ) : null}

      {activeTab === 'bulk_orders' ? (
        <AdminBulkOrdersTab
          bottomPadding={bottomPadding}
          bulkOrders={bulkOrders}
          isLoading={isLoading}
          stats={bulkStats}
          onRefresh={loadData}
        />
      ) : null}

      {activeTab === 'users' ? (
        <View className="flex-1">
          <View style={styles.usersHeaderBar}>
            <Pressable
              hitSlop={8}
              style={styles.usersBackBtn}
              onPress={() => setActiveTab('home')}>
              <Icon color={colors.white} name="arrow-back" size={18} />
              <Text style={styles.usersBackBtnText}>Dashboard</Text>
            </Pressable>
            <Text style={styles.usersHeaderTitle}>Society Residents</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.usersSubNav}>
            <Pressable
              style={[styles.usersSubTab, usersSubTab === 'approvals' && styles.usersSubTabActive]}
              onPress={() => setUsersSubTab('approvals')}>
              <Text
                style={[
                  styles.usersSubTabText,
                  usersSubTab === 'approvals' && styles.usersSubTabTextActive,
                ]}>
                Approvals
              </Text>
              {pendingUsers.length > 0 ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingUsers.length}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              style={[styles.usersSubTab, usersSubTab === 'all' && styles.usersSubTabActive]}
              onPress={() => setUsersSubTab('all')}>
              <Text
                style={[
                  styles.usersSubTabText,
                  usersSubTab === 'all' && styles.usersSubTabTextActive,
                ]}>
                All users
              </Text>
            </Pressable>
            <Pressable
              style={[styles.usersSubTab, usersSubTab === 'households' && styles.usersSubTabActive]}
              onPress={() => setUsersSubTab('households')}>
              <Text
                style={[
                  styles.usersSubTabText,
                  usersSubTab === 'households' && styles.usersSubTabTextActive,
                ]}>
                Households
              </Text>
            </Pressable>
          </View>
          {usersSubTab === 'approvals' ? (
            <AdminApprovalsTab
              approvedUsers={approvedUsers}
              bottomPadding={bottomPadding}
              isLoading={isLoading}
              pendingUsers={pendingUsers}
              rejectedUsers={rejectedUsers}
              suspendedUsers={suspendedUsers}
              onRefresh={loadData}
            />
          ) : usersSubTab === 'households' ? (
            <AdminHouseholdsTab
              bottomPadding={bottomPadding}
              households={households}
              isLoading={isLoading}
              stats={householdStats}
              onRefresh={loadData}
            />
          ) : (
            <AdminUsersTab bottomPadding={bottomPadding} users={users} />
          )}
        </View>
      ) : null}

      {activeTab === 'orders' ? (
        <AdminOrdersTab
          bottomPadding={bottomPadding}
          orders={orders}
          updatingId={updatingId}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : null}

      {activeTab === 'payments' ? (
        <AdminPaymentsTab bottomPadding={bottomPadding} orders={orders} stats={stats} />
      ) : null}

      {activeTab === 'account' ? (
        <AdminAccountTab
          adminName={adminName}
          bottomPadding={bottomPadding}
          loginLogs={loginLogs}
          mobileNumber={adminMobile}
          onLogout={handleLogout}
          onViewAllActivity={() => navigation.navigate('AdminLoginActivity')}
          onViewStore={() => navigation.navigate('Home', { fromAdmin: true })}
        />
      ) : null}

      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: insets.bottom + 10,
            left: chromeInset.left,
            right: chromeInset.right,
          },
        ]}>
        <NavItem
          active={activeTab === 'home'}
          icon="home"
          label="Home"
          onPress={() => setActiveTab('home')}
        />
        <NavItem
          active={activeTab === 'bulk_orders'}
          badge={bulkStats.confirmedCount > 0 ? bulkStats.confirmedCount : (bulkStats.totalDeals > 0 ? bulkStats.totalDeals : undefined)}
          icon="chatbox-ellipses"
          label="Bulk Orders"
          onPress={() => setActiveTab('bulk_orders')}
        />
        <Pressable
          className="-mt-6 items-center justify-center"
          onPress={() => setActiveTab('orders')}>
          <View style={[styles.centerButton, activeTab === 'orders' && styles.centerButtonActive]}>
            <Icon color={colors.white} name="receipt" size={26} />
            {stats.activeOrders > 0 ? (
              <View style={styles.badge}>
                <Text className="text-[10px] font-bold text-white">{stats.activeOrders}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <NavItem
          active={activeTab === 'payments'}
          icon="card"
          label="Payments"
          onPress={() => setActiveTab('payments')}
        />
        <NavItem
          active={activeTab === 'account'}
          icon="person"
          label="Account"
          onPress={() => setActiveTab('account')}
        />
      </View>
    </View>
  );
}

function NavItem({
  active,
  icon,
  label,
  onPress,
  badge,
}: {
  active: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable className="items-center justify-center" onPress={onPress}>
      <View>
        <Icon
          color={active ? colors.primary : colors.textMuted}
          name={active ? icon : `${icon}-outline`}
          size={24}
        />
        {badge && badge > 0 ? (
          <View style={styles.navBadge}>
            <Text className="text-[9px] font-bold text-white">{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text
        className={`mt-1 text-xs ${active ? 'font-semibold text-primary' : 'text-slate-400'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 100,
  },
  centerButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    elevation: 8,
    height: 64,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 64,
  },
  centerButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 2,
    top: 2,
  },
  navBadge: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -8,
    top: -4,
  },
  usersSubNav: {
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  usersSubTab: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  usersSubTabActive: {
    backgroundColor: colors.accent,
  },
  usersSubTabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  usersSubTabTextActive: {
    color: colors.primaryDark,
  },
  pendingBadge: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
  },
  pendingBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  usersHeaderBar: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  usersBackBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  usersBackBtnText: {
    color: colors.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  usersHeaderTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
