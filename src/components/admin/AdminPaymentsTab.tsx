import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { AdminDashboardStats } from '../../services/adminDashboardService';
import { calculateOrderTotal } from '../../services/orderService';
import { GfmOrder } from '../../types/gfm';
import { colors } from '../../theme/colors';
import { CONTENT_MAX } from '../../utils/layout';

type Props = {
  stats: AdminDashboardStats;
  orders: GfmOrder[];
  bottomPadding: number;
};

type PaymentFilter = 'all' | 'today' | 'delivered' | 'pending' | 'cancelled';

const FILTERS: { id: PaymentFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'pending', label: 'Pending' },
  { id: 'cancelled', label: 'Cancelled' },
];

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatWhen(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusMeta(status: string) {
  const value = status.toLowerCase();
  if (value === 'delivered') return { bg: '#ECFDF3', text: '#166534', icon: 'checkmark-circle' };
  if (value === 'cancelled') return { bg: '#FEF2F2', text: '#B91C1C', icon: 'close-circle' };
  if (value === 'arriving' || value === 'ready') return { bg: '#ECFDF3', text: '#15803D', icon: 'bicycle' };
  if (value === 'packing') return { bg: '#FFF7ED', text: '#C2410C', icon: 'cube' };
  return { bg: '#F8FAFC', text: '#475569', icon: 'time' };
}

function matchesFilter(order: GfmOrder, filter: PaymentFilter) {
  const status = (order.status || 'placed').toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  if (filter === 'today') return order.orderedAt?.startsWith(today);
  if (filter === 'delivered') return status === 'delivered';
  if (filter === 'pending') return status === 'placed' || status === 'confirmed';
  if (filter === 'cancelled') return status === 'cancelled';
  return true;
}

export function AdminPaymentsTab({ stats, orders, bottomPadding }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PaymentFilter>('all');

  const monthPrefix = new Date().toISOString().slice(0, 7);

  const monthStats = useMemo(() => {
    let revenue = 0;
    let count = 0;
    for (const order of orders) {
      if ((order.status || '').toLowerCase() === 'cancelled') continue;
      if (!order.orderedAt?.startsWith(monthPrefix)) continue;
      revenue += calculateOrderTotal(order.items);
      count += 1;
    }
    return { revenue, count };
  }, [monthPrefix, orders]);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(order => {
      if (!matchesFilter(order, filter)) return false;
      if (!q) return true;
      return (
        order.customerName.toLowerCase().includes(q) ||
        order.orderId.toLowerCase().includes(q) ||
        order.mobileNumber.includes(q) ||
        order.blockNumber.toLowerCase().includes(q)
      );
    });
  }, [filter, orders, query]);

  const filteredRevenue = useMemo(
    () =>
      filteredPayments
        .filter(o => (o.status || '').toLowerCase() !== 'cancelled')
        .reduce((sum, order) => sum + calculateOrderTotal(order.items), 0),
    [filteredPayments],
  );

  const avgOrder =
    filteredPayments.length > 0
      ? Math.round(filteredRevenue / Math.max(filteredPayments.filter(o => (o.status || '').toLowerCase() !== 'cancelled').length, 1))
      : 0;

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
              Revenue & checkout
            </Text>
            <Text className="mt-1 text-2xl font-bold text-white">Payments</Text>
            <Text className="mt-1 text-sm text-white/70">
              Track collections and payment activity
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon color={colors.primaryDark} name="wallet" size={22} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <HeroStat label="Today" value={formatMoney(stats.revenueToday)} compact />
          <View style={styles.heroDivider} />
          <HeroStat label="This month" value={formatMoney(monthStats.revenue)} compact />
          <View style={styles.heroDivider} />
          <HeroStat label="All time" value={formatMoney(stats.revenueTotal)} compact />
        </View>
      </View>

      <View className="px-5 -mt-8" style={{ alignSelf: 'center', maxWidth: CONTENT_MAX.wide, width: '100%' }}>
        <View style={styles.revenueCard}>
          <View style={styles.revenueAccent} />
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Filtered revenue
              </Text>
              <Text className="mt-1 text-3xl font-bold text-slate-900">
                {formatMoney(filteredRevenue)}
              </Text>
            </View>
            <View style={styles.revenueIcon}>
              <Icon color={colors.primary} name="trending-up" size={22} />
            </View>
          </View>
          <View className="mt-3 flex-row gap-3">
            <MiniStat label="Payments" value={String(filteredPayments.length)} />
            <MiniStat label="Avg order" value={formatMoney(avgOrder)} />
            <MiniStat label="Month orders" value={String(monthStats.count)} />
          </View>
        </View>

        <View style={styles.searchBar}>
          <Icon color={colors.textMuted} name="search-outline" size={18} />
          <TextInput
            placeholder="Search customer, order ID, mobile..."
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

        <Text className="mb-3 mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          {filteredPayments.length} payment{filteredPayments.length === 1 ? '' : 's'}
        </Text>

        <View style={styles.listCard}>
          {filteredPayments.length === 0 ? (
            <View style={styles.empty}>
              <Icon color={colors.textMuted} name="card-outline" size={40} />
              <Text className="mt-3 text-base font-bold text-slate-700">No payments found</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                Try another filter or search term.
              </Text>
            </View>
          ) : (
            filteredPayments.map((order, index) => {
              const total = calculateOrderTotal(order.items);
              const meta = statusMeta(order.status);
              const isCancelled = (order.status || '').toLowerCase() === 'cancelled';

              return (
                <View key={order.id}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                      <Icon color={meta.text} name={meta.icon} size={18} />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center">
                        <Text className="flex-1 text-sm font-bold text-slate-900" numberOfLines={1}>
                          {order.customerName}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                          <Text style={{ color: meta.text, fontSize: 9, fontWeight: '700' }}>
                            {(order.status || 'placed').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-1 text-xs text-slate-500">{order.orderId}</Text>
                      <Text className="mt-0.5 text-[11px] text-slate-400">
                        {formatWhen(order.orderedAt)} · Block {order.blockNumber}
                      </Text>
                    </View>
                    <View className="items-end ml-2">
                      <Text
                        style={[
                          styles.amount,
                          isCancelled && styles.amountCancelled,
                        ]}>
                        {formatMoney(total)}
                      </Text>
                      <Icon
                        color={isCancelled ? colors.textMuted : colors.primary}
                        name={isCancelled ? 'close-circle-outline' : 'checkmark-circle-outline'}
                        size={14}
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function HeroStat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View className="flex-1 items-center px-1">
      <Text
        className="font-bold text-white"
        numberOfLines={1}
        style={{ fontSize: compact ? 13 : 18 }}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text className="text-sm font-bold text-slate-900">{value}</Text>
      <Text className="text-[10px] font-semibold text-slate-500">{label}</Text>
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
  revenueCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 4,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  revenueAccent: {
    backgroundColor: colors.accent,
    height: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  revenueIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  miniStat: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 4,
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
  listCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginLeft: 66,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  statusPill: {
    borderRadius: 999,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  amountCancelled: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  empty: {
    alignItems: 'center',
    padding: 28,
  },
});
