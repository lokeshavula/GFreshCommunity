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
import { HouseholdStats } from '../../services/householdService';
import { GfmHousehold } from '../../types/gfm';
import { colors } from '../../theme/colors';
import { CONTENT_MAX } from '../../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  households: GfmHousehold[];
  stats: HouseholdStats;
  bottomPadding: number;
  isLoading?: boolean;
  onRefresh?: () => void;
};

export function AdminHouseholdsTab({
  households,
  stats,
  bottomPadding,
  isLoading,
  onRefresh,
}: Props) {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return households;
    return households.filter(h => {
      return (
        h.tower.toLowerCase().includes(q) ||
        h.flatNumber.toLowerCase().includes(q) ||
        (h.communityName ?? '').toLowerCase().includes(q) ||
        (h.primaryUserName ?? '').toLowerCase().includes(q) ||
        (h.primaryUserMobile ?? '').includes(q)
      );
    });
  }, [households, query]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroOrb} />
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-bold uppercase tracking-wide text-accent">Residences</Text>
            <Text className="mt-1 text-2xl font-bold text-white">Households</Text>
            <Text className="mt-1 text-sm text-white/70">One active household per flat</Text>
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
          <HeroStat label="Total" value={String(stats.total)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Active" value={String(stats.active)} highlight={stats.active > 0} />
          <View style={styles.heroDivider} />
          <HeroStat label="Other" value={String(stats.inactive + stats.suspended)} />
        </View>
      </View>

      <View className="px-5 -mt-8" style={{ alignSelf: 'center', maxWidth: CONTENT_MAX.wide, width: '100%' }}>
        <View style={styles.searchBar}>
          <Icon color={colors.textMuted} name="search-outline" size={18} />
          <TextInput
            placeholder="Search flat, tower, resident, mobile..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <Text className="mb-3 mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          {filtered.length} household{filtered.length === 1 ? '' : 's'}
        </Text>

        <View style={{ gap: 10 }}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Icon color={colors.textMuted} name="home-outline" size={40} />
              <Text className="mt-3 text-base font-bold text-slate-700">No households found</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Households are created when residents are approved.
              </Text>
            </View>
          ) : (
            filtered.map(household => (
              <HouseholdCard
                key={household.id}
                household={household}
                onPress={() =>
                  navigation.navigate('AdminHouseholdDetail', { householdId: household.id })
                }
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

function HouseholdCard({
  household,
  onPress,
}: {
  household: GfmHousehold;
  onPress: () => void;
}) {
  const statusColor =
    household.status === 'ACTIVE'
      ? '#166534'
      : household.status === 'SUSPENDED'
        ? '#92400E'
        : '#64748B';
  const statusBg =
    household.status === 'ACTIVE'
      ? '#ECFDF3'
      : household.status === 'SUSPENDED'
        ? '#FFFBEB'
        : '#F1F5F9';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View className="flex-row items-start">
        <View style={styles.iconWrap}>
          <Icon color={colors.primary} name="home" size={20} />
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-base font-bold text-slate-900">
              Tower {household.tower} · {household.flatNumber}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{household.status}</Text>
            </View>
          </View>
          <Text className="mt-1 text-xs text-slate-500">
            {household.communityName ?? 'Community'}
          </Text>
          <View className="mt-2 flex-row items-center">
            <Icon color={colors.primary} name="person-outline" size={12} />
            <Text className="ml-1 text-sm font-semibold text-slate-700">
              {household.primaryUserName ?? 'No primary set'}
            </Text>
          </View>
          {household.primaryUserMobile ? (
            <Text className="mt-0.5 text-xs text-slate-400">{household.primaryUserMobile}</Text>
          ) : null}
        </View>
        <Icon color={colors.textMuted} name="chevron-forward" size={18} />
      </View>
    </Pressable>
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
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
  empty: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
  },
});
