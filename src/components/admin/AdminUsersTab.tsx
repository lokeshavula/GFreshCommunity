import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { AdminUserRow } from '../../services/adminDashboardService';
import { formatLoginTime } from '../../services/loginTrackingService';
import { colors } from '../../theme/colors';
import { CONTENT_MAX } from '../../utils/layout';

type Props = {
  users: AdminUserRow[];
  bottomPadding: number;
};

type UserFilter = 'all' | 'residents' | 'admins' | 'active' | 'inactive';
type SortKey = 'login' | 'name' | 'block';

const FILTERS: { id: UserFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'residents', label: 'Residents' },
  { id: 'admins', label: 'Admins' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'login', label: 'Last login' },
  { id: 'name', label: 'Name' },
  { id: 'block', label: 'Block' },
];

function matchesFilter(user: AdminUserRow, filter: UserFilter) {
  if (filter === 'residents') return !user.isAdmin;
  if (filter === 'admins') return Boolean(user.isAdmin);
  if (filter === 'active') return Boolean(user.lastLoginAt);
  if (filter === 'inactive') return !user.lastLoginAt;
  return true;
}

function sortUsers(list: AdminUserRow[], sort: SortKey) {
  return [...list].sort((a, b) => {
    if (sort === 'name') {
      return a.fullName.localeCompare(b.fullName);
    }
    if (sort === 'block') {
      const blockCompare = a.blockNumber.localeCompare(b.blockNumber);
      if (blockCompare !== 0) return blockCompare;
      return a.flatNo.localeCompare(b.flatNo);
    }
    const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function AdminUsersTab({ users, bottomPadding }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [sort, setSort] = useState<SortKey>('login');

  const stats = useMemo(() => {
    let residents = 0;
    let admins = 0;
    let active = 0;
    for (const user of users) {
      if (user.isAdmin) admins += 1;
      else residents += 1;
      if (user.lastLoginAt) active += 1;
    }
    return { total: users.length, residents, admins, active };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = users.filter(user => {
      if (!matchesFilter(user, filter)) return false;
      if (!q) return true;
      return (
        user.fullName.toLowerCase().includes(q) ||
        user.mobileNumber.includes(q) ||
        user.blockNumber.toLowerCase().includes(q) ||
        user.flatNo.toLowerCase().includes(q)
      );
    });
    return sortUsers(matched, sort);
  }, [filter, query, sort, users]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroOrbLarge} />
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-bold uppercase tracking-wide text-accent">
              Community members
            </Text>
            <Text className="mt-1 text-2xl font-bold text-white">Users</Text>
            <Text className="mt-1 text-sm text-white/70">
              Residents, admins & login activity
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon color={colors.primaryDark} name="people" size={22} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <HeroStat label="Total" value={String(stats.total)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Residents" value={String(stats.residents)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Active" value={String(stats.active)} />
        </View>
      </View>

      <View className="px-5 -mt-8" style={{ alignSelf: 'center', maxWidth: CONTENT_MAX.wide, width: '100%' }}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text className="text-xl font-bold text-slate-900">{stats.residents}</Text>
            <Text className="text-[11px] font-semibold text-slate-500">Residents</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text className="text-xl font-bold text-slate-900">{stats.admins}</Text>
            <Text className="text-[11px] font-semibold text-slate-500">Admins</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text className="text-xl font-bold text-slate-900">{stats.total - stats.active}</Text>
            <Text className="text-[11px] font-semibold text-slate-500">Inactive</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Icon color={colors.textMuted} name="search-outline" size={18} />
          <TextInput
            placeholder="Search name, mobile, block, flat..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Icon color={colors.textMuted} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.chipRow}
          showsHorizontalScrollIndicator={false}>
          {FILTERS.map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(item.id)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          contentContainerStyle={[styles.chipRow, { paddingTop: 0 }]}
          showsHorizontalScrollIndicator={false}>
          {SORTS.map(item => {
            const active = sort === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.sortChip, active && styles.sortChipActive]}
                onPress={() => setSort(item.id)}>
                <Icon
                  color={active ? colors.white : colors.primary}
                  name="swap-vertical-outline"
                  size={12}
                />
                <Text style={[styles.sortChipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="mb-3 mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          {filteredUsers.length} result{filteredUsers.length === 1 ? '' : 's'}
        </Text>

        <View style={{ gap: 10 }}>
          {filteredUsers.length === 0 ? (
            <View style={styles.empty}>
              <Icon color={colors.textMuted} name="people-outline" size={40} />
              <Text className="mt-3 text-base font-bold text-slate-700">No users found</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Try another filter or search term.
              </Text>
            </View>
          ) : (
            filteredUsers.map(user => (
              <UserCard key={user.id} user={user} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </Text>
    </View>
  );
}

function UserCard({ user }: { user: AdminUserRow }) {
  const isActive = Boolean(user.lastLoginAt);

  return (
    <View style={[styles.card, user.isAdmin && styles.cardAdmin]}>
      {user.isAdmin ? <View style={styles.adminAccent} /> : null}
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, user.isAdmin && styles.avatarAdmin]}>
          <Text className="text-base font-bold text-green-700">
            {user.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-sm font-bold text-slate-900" numberOfLines={1}>
            {user.fullName}
          </Text>
          {user.isAdmin ? (
            <View style={styles.adminPill}>
              <Text className="text-[10px] font-bold text-primary-dark">ADMIN</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, isActive ? styles.statusActive : styles.statusInactive]}>
              <Text
                style={[
                  styles.statusText,
                  { color: isActive ? '#166534' : '#64748B' },
                ]}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          )}
        </View>

        <Text className="mt-1 text-xs text-slate-500">{user.mobileNumber}</Text>

        <View className="mt-2 flex-row flex-wrap gap-2">
          <InfoChip icon="business-outline" label={`Block ${user.blockNumber}`} />
          <InfoChip icon="home-outline" label={`Flat ${user.flatNo}`} />
        </View>

        <View className="mt-2 flex-row items-center">
          <Icon color={colors.primary} name="log-in-outline" size={12} />
          <Text className="ml-1 flex-1 text-[11px] font-semibold text-slate-500">
            {user.lastLoginAt
              ? `Last login ${formatLoginTime(user.lastLoginAt)}`
              : 'Never logged in'}
            {user.loginCount ? ` · ${user.loginCount} visits` : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InfoChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.infoChip}>
      <Icon color={colors.primary} name={icon} size={11} />
      <Text className="ml-1 text-[10px] font-semibold text-slate-600">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'relative',
  },
  heroOrbLarge: {
    backgroundColor: 'rgba(184, 240, 74, 0.08)',
    borderRadius: 999,
    height: 140,
    position: 'absolute',
    right: -30,
    top: -20,
    width: 140,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroStatsRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    flexDirection: 'row',
    marginTop: 18,
    paddingVertical: 14,
  },
  heroDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    height: 28,
    width: 1,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    marginBottom: 14,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    backgroundColor: '#E2E8F0',
    height: 32,
    width: 1,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 0,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 12,
  },
  chip: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.white,
  },
  sortChip: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 14,
    position: 'relative',
  },
  cardAdmin: {
    borderColor: '#BBF7D0',
  },
  adminAccent: {
    backgroundColor: colors.accent,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  avatar: {
    borderRadius: 22,
    height: 48,
    width: 48,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 22,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarAdmin: {
    backgroundColor: colors.accent,
  },
  adminPill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusActive: {
    backgroundColor: '#ECFDF3',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  infoChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
  },
});
