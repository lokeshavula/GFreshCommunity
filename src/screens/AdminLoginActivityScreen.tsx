import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  fetchRecentLoginLogs,
  formatLoginTime,
  LoginLog,
  LoginRole,
} from '../services/loginTrackingService';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLoginActivity'>;
type Filter = 'all' | LoginRole;

function groupByDay(logs: LoginLog[]) {
  const groups: { label: string; items: LoginLog[] }[] = [];
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dayKey = (iso: string) => iso.slice(0, 10);
  const labelFor = (iso: string) => {
    const key = dayKey(iso);
    if (key === today.toISOString().slice(0, 10)) return 'Today';
    if (key === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  for (const log of logs) {
    const label = labelFor(log.createdAt);
    const existing = groups.find(group => group.label === label);
    if (existing) {
      existing.items.push(log);
    } else {
      groups.push({ label, items: [log] });
    }
  }

  return groups;
}

export function AdminLoginActivityScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    width: 'wide',
    paddingBottom: insets.bottom + 28,
  });
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        const data = await fetchRecentLoginLogs(200);
        if (mounted) {
          setLogs(data);
          setLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return logs;
    }
    return logs.filter(log => log.role === filter);
  }, [filter, logs]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = logs.filter(log => log.createdAt.startsWith(todayKey)).length;
  const userCount = logs.filter(log => log.role === 'user').length;
  const adminCount = logs.filter(log => log.role === 'admin').length;

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle={`${logs.length} total sign-ins tracked`}
        title="Login activity"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={[{ paddingTop: 20 }, contentStyle]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Icon color={colors.primaryDark} name="pulse" size={22} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-slate-900">Community access timeline</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-500">
                Every customer and admin sign-in across iOS and Android.
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            <SummaryChip label="Today" value={String(todayCount)} tone="#ECFDF3" />
            <SummaryChip label="Users" value={String(userCount)} tone="#EFF6FF" />
            <SummaryChip label="Admins" value={String(adminCount)} tone="#FEF3C7" />
          </View>

          <View style={styles.filterRow}>
            {([
              { id: 'all', label: 'All' },
              { id: 'user', label: 'Customers' },
              { id: 'admin', label: 'Admins' },
            ] as const).map(item => {
              const active = filter === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(item.id)}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Icon color={colors.textMuted} name="time-outline" size={40} />
              <Text className="mt-3 text-base font-bold text-slate-700">No activity yet</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Login events will show here after the next sign-in.
              </Text>
            </View>
          ) : (
            groups.map(group => (
              <View key={group.label} className="mt-5">
                <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {group.label}
                </Text>
                <View style={styles.timelineCard}>
                  {group.items.map((log, index) => (
                    <View key={log.id} style={styles.timelineRow}>
                      <View style={styles.timelineRail}>
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor:
                                log.role === 'admin' ? '#F59E0B' : colors.primary,
                            },
                          ]}
                        />
                        {index < group.items.length - 1 ? <View style={styles.rail} /> : null}
                      </View>
                      <View style={[styles.eventCard, index > 0 && { marginTop: 10 }]}>
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                              {log.fullName}
                            </Text>
                            <Text className="mt-1 text-xs text-slate-500">
                              {log.mobileNumber}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.rolePill,
                              {
                                backgroundColor:
                                  log.role === 'admin' ? '#FEF3C7' : '#ECFDF3',
                              },
                            ]}>
                            <Text
                              style={{
                                color: log.role === 'admin' ? '#B45309' : '#166534',
                                fontSize: 10,
                                fontWeight: '700',
                              }}>
                              {log.role.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <View className="mt-3 flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Icon
                              color={colors.textMuted}
                              name={log.platform === 'ios' ? 'logo-apple' : 'logo-android'}
                              size={14}
                            />
                            <Text className="ml-1.5 text-xs font-semibold text-slate-500">
                              {log.platform}
                            </Text>
                          </View>
                          <Text className="text-xs font-bold text-slate-400">
                            {formatLoginTime(log.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={[styles.summaryChip, { backgroundColor: tone, flex: 1 }]}>
      <Text className="text-lg font-bold text-slate-900">{value}</Text>
      <Text className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: colors.white,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 20,
    padding: 28,
  },
  timelineCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineRail: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 18,
    width: 16,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  rail: {
    backgroundColor: '#E2E8F0',
    flex: 1,
    marginTop: 4,
    width: 2,
  },
  eventCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  rolePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
