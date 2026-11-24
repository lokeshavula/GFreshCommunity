import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { LoginLog, formatLoginTime } from '../../services/loginTrackingService';
import { colors } from '../../theme/colors';
import { CONTENT_MAX } from '../../utils/layout';

type Props = {
  adminName: string;
  mobileNumber?: string;
  bottomPadding: number;
  loginLogs: LoginLog[];
  onLogout: () => void;
  onViewStore: () => void;
  onViewAllActivity: () => void;
};

export function AdminAccountTab({
  adminName,
  mobileNumber,
  bottomPadding,
  loginLogs,
  onLogout,
  onViewStore,
  onViewAllActivity,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const loginsToday = loginLogs.filter(log => log.createdAt.startsWith(today)).length;
  const adminLogins = loginLogs.filter(log => log.role === 'admin').length;
  const userLogins = loginLogs.filter(log => log.role === 'user').length;
  const previewLogs = loginLogs.slice(0, 5);
  const hasMore = loginLogs.length > 5;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: bottomPadding,
        alignSelf: 'center',
        maxWidth: CONTENT_MAX.page,
        width: '100%',
      }}
      showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-slate-900">Account</Text>
      <Text className="mt-1 text-sm text-slate-500">Admin profile and login tracking</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text className="text-2xl font-bold text-green-700">
            {adminName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="mt-3 text-lg font-bold text-slate-900">{adminName}</Text>
        <Text className="mt-1 text-sm text-slate-500">{mobileNumber ?? 'Admin account'}</Text>
        <View style={styles.rolePill}>
          <Icon color={colors.primaryDark} name="shield-checkmark" size={12} />
          <Text className="ml-1 text-[10px] font-bold text-primary-dark">ADMIN ACCESS</Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text className="text-xl font-bold text-slate-900">{loginsToday}</Text>
          <Text className="mt-1 text-xs text-slate-500">Logins today</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text className="text-xl font-bold text-slate-900">{userLogins}</Text>
          <Text className="mt-1 text-xs text-slate-500">User logins</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text className="text-xl font-bold text-slate-900">{adminLogins}</Text>
          <Text className="mt-1 text-xs text-slate-500">Admin logins</Text>
        </View>
      </View>

      <View className="mb-3 mt-6 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-900">Recent login activity</Text>
        {hasMore ? (
          <Pressable className="flex-row items-center" onPress={onViewAllActivity}>
            <Text className="text-xs font-bold text-primary">View all</Text>
            <Icon color={colors.primary} name="chevron-forward" size={14} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.menuCard}>
        {loginLogs.length === 0 ? (
          <View className="items-center px-4 py-8">
            <Icon color={colors.textMuted} name="time-outline" size={28} />
            <Text className="mt-2 text-center text-sm text-slate-500">
              No login activity yet. Sign-ins will appear here after users log in.
            </Text>
          </View>
        ) : (
          previewLogs.map((log, index) => (
            <View key={log.id} style={[styles.row, index > 0 && styles.rowBorder]}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: log.role === 'admin' ? '#FEF3C7' : '#ECFDF3' },
                ]}>
                <Icon
                  color={log.role === 'admin' ? '#B45309' : colors.primary}
                  name={log.role === 'admin' ? 'shield-outline' : 'person-outline'}
                  size={16}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {log.fullName}
                </Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  {log.mobileNumber} · {log.platform} · {log.role}
                </Text>
              </View>
              <Text className="text-[11px] font-semibold text-slate-400">
                {formatLoginTime(log.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>

      {hasMore ? (
        <Pressable style={styles.viewAllButton} onPress={onViewAllActivity}>
          <Icon color={colors.primary} name="list-outline" size={16} />
          <Text className="ml-2 text-sm font-bold text-primary">
            View all {loginLogs.length} login events
          </Text>
        </Pressable>
      ) : null}

      <View style={[styles.menuCard, { marginTop: 16 }]}>
        <Pressable style={styles.row} onPress={onViewStore}>
          <View style={styles.iconWrap}>
            <Icon color={colors.primary} name="storefront-outline" size={18} />
          </View>
          <Text className="ml-3 flex-1 text-sm font-bold text-slate-900">View customer app</Text>
          <Icon color="#94A3B8" name="chevron-forward" size={16} />
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Icon color={colors.danger} name="log-out-outline" size={18} />
        <Text className="ml-2 text-sm font-bold text-red-500">Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 22,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  rolePill: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
  },
  viewAllButton: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
});
