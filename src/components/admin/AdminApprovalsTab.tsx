import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/AppNavigator';
import { PendingUserRow } from '../../types/gfm';
import { colors } from '../../theme/colors';
import { CONTENT_MAX } from '../../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ApprovalFilter = 'pending' | 'approved' | 'rejected' | 'suspended';

type Props = {
  pendingUsers: PendingUserRow[];
  approvedUsers: PendingUserRow[];
  rejectedUsers: PendingUserRow[];
  suspendedUsers: PendingUserRow[];
  bottomPadding: number;
  isLoading?: boolean;
  onRefresh?: () => void;
};

const FILTERS: { id: ApprovalFilter; label: string; icon: string }[] = [
  { id: 'pending', label: 'Pending', icon: 'hourglass-outline' },
  { id: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
  { id: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
  { id: 'suspended', label: 'Suspended', icon: 'shield-outline' },
];

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminApprovalsTab({
  pendingUsers,
  approvedUsers,
  rejectedUsers,
  suspendedUsers,
  bottomPadding,
  isLoading,
  onRefresh,
}: Props) {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<ApprovalFilter>('pending');
  const [query, setQuery] = useState('');

  const lists: Record<ApprovalFilter, PendingUserRow[]> = {
    pending: pendingUsers,
    approved: approvedUsers,
    rejected: rejectedUsers,
    suspended: suspendedUsers,
  };

  const filtered = useMemo(() => {
    const source = lists[filter];
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      user =>
        user.fullName.toLowerCase().includes(q) ||
        user.mobileNumber.includes(q) ||
        (user.communityName ?? '').toLowerCase().includes(q) ||
        (user.tower ?? user.blockNumber).toLowerCase().includes(q) ||
        user.flatNo.toLowerCase().includes(q),
    );
  }, [filter, lists, query, pendingUsers, approvedUsers, rejectedUsers, suspendedUsers]);

  const counts = {
    pending: pendingUsers.length,
    approved: approvedUsers.length,
    rejected: rejectedUsers.length,
    suspended: suspendedUsers.length,
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroOrb} />
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-bold uppercase tracking-wide text-accent">
              User approvals
            </Text>
            <Text className="mt-1 text-2xl font-bold text-white">Registrations</Text>
            <Text className="mt-1 text-sm text-white/70">
              Review and approve community residents
            </Text>
          </View>
          <Pressable hitSlop={8} onPress={onRefresh} style={styles.refreshBtn}>
            {isLoading ? (
              <ActivityIndicator color={colors.primaryDark} size="small" />
            ) : (
              <Icon color={colors.primaryDark} name="refresh-outline" size={20} />
            )}
          </Pressable>
        </View>

        <View style={styles.heroStats}>
          <HeroStat label="Pending" value={String(counts.pending)} highlight={counts.pending > 0} />
          <View style={styles.heroDivider} />
          <HeroStat label="Approved" value={String(counts.approved)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Rejected" value={String(counts.rejected)} />
        </View>
      </View>

      <View className="px-5 -mt-8" style={{ alignSelf: 'center', maxWidth: CONTENT_MAX.wide, width: '100%' }}>
        <View style={styles.searchBar}>
          <Icon color={colors.textMuted} name="search-outline" size={18} />
          <TextInput
            placeholder="Search name, mobile, flat..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
          {FILTERS.map(item => {
            const active = filter === item.id;
            const count = counts[item.id];
            return (
              <Pressable
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(item.id)}>
                <Icon color={active ? colors.white : colors.primary} name={item.icon} size={14} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                  {count > 0 ? ` (${count})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: 10 }}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Icon color={colors.textMuted} name="document-text-outline" size={40} />
              <Text className="mt-3 text-base font-bold text-slate-700">
                {filter === 'pending' ? 'No pending approvals' : 'No users in this list'}
              </Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                {filter === 'pending'
                  ? 'New registrations will appear here for review.'
                  : 'Try another filter or search term.'}
              </Text>
            </View>
          ) : (
            filtered.map(user => (
              <ApprovalCard
                key={user.id}
                filter={filter}
                user={user}
                onReview={() => navigation.navigate('AdminUserReview', { userId: user.id })}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function HeroStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className={`text-lg font-bold ${highlight ? 'text-accent' : 'text-white'}`}>{value}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </Text>
    </View>
  );
}

function ApprovalCard({
  user,
  filter,
  onReview,
}: {
  user: PendingUserRow;
  filter: ApprovalFilter;
  onReview: () => void;
}) {
  const statusColor =
    filter === 'pending'
      ? '#C2410C'
      : filter === 'approved'
        ? '#166534'
        : filter === 'rejected'
          ? '#B91C1C'
          : '#92400E';

  const statusBg =
    filter === 'pending'
      ? '#FFF7ED'
      : filter === 'approved'
        ? '#ECFDF3'
        : filter === 'rejected'
          ? '#FEF2F2'
          : '#FFFBEB';

  return (
    <View style={styles.card}>
      <View className="flex-row items-start">
        <View style={styles.avatar}>
          <Text className="text-base font-bold text-green-700">
            {user.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-sm font-bold text-slate-900" numberOfLines={1}>
              {user.fullName}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {(user.accountStatus ?? 'PENDING').replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text className="mt-1 text-xs text-slate-500">{user.mobileNumber}</Text>
          {user.email ? <Text className="text-xs text-slate-400">{user.email}</Text> : null}

          <View className="mt-2 flex-row flex-wrap gap-2">
            <InfoChip icon="business-outline" label={user.communityName ?? 'Community'} />
            <InfoChip icon="layers-outline" label={`Tower ${user.tower ?? user.blockNumber}`} />
            <InfoChip icon="home-outline" label={`Flat ${user.flatNo}`} />
          </View>

          <Text className="mt-2 text-[11px] text-slate-400">
            Registered {formatDate(user.createdAt)}
          </Text>

          {filter === 'pending' ? (
            <Pressable style={styles.reviewBtn} onPress={onReview}>
              <Text style={styles.reviewBtnText}>Review</Text>
              <Icon color={colors.white} name="arrow-forward" size={16} />
            </Pressable>
          ) : filter === 'rejected' && user.rejectionReason ? (
            <Text className="mt-2 text-xs text-red-600">Reason: {user.rejectionReason}</Text>
          ) : null}
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
  heroOrb: {
    backgroundColor: 'rgba(184, 240, 74, 0.08)',
    borderRadius: 999,
    height: 140,
    position: 'absolute',
    right: -30,
    top: -20,
    width: 140,
  },
  refreshBtn: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heroStats: {
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
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
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
    paddingBottom: 12,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
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
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 22,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  reviewBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  reviewBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
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
