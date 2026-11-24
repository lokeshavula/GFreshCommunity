import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { AdminActivityCalendar } from './AdminActivityCalendar';
import { AdminDashboardStats } from '../../services/adminDashboardService';
import { GfmOrder } from '../../types/gfm';
import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  adminName: string;
  stats: AdminDashboardStats;
  orders: GfmOrder[];
  bottomPadding: number;
  pendingUsersCount?: number;
  onOpenTab: (tab: 'users' | 'orders' | 'payments' | 'account' | 'bulk_orders') => void;
  onViewStore: () => void;
  onOpenDailyPrices: () => void;
  onOpenDemandPoll?: () => void;
  onOpenProductImages: () => void;
  onOpenFreshArrivals?: () => void;
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

const METRICS = [
  {
    id: 'users',
    label: 'Residents',
    hint: 'Registered community users',
    icon: 'people',
    tab: 'users' as const,
    valueKey: 'usersCount' as const,
    tone: '#0A5C3E',
    soft: '#ECFDF3',
  },
  {
    id: 'orders',
    label: 'Total orders',
    hint: 'All-time order volume',
    icon: 'receipt',
    tab: 'orders' as const,
    valueKey: 'ordersCount' as const,
    tone: '#15803D',
    soft: '#ECFDF3',
  },
  {
    id: 'pending',
    label: 'Pending',
    hint: 'Needs confirmation or action',
    icon: 'hourglass',
    tab: 'orders' as const,
    valueKey: 'pendingOrders' as const,
    tone: '#C2410C',
    soft: '#FFF7ED',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    hint: 'Successfully completed',
    icon: 'checkmark-done',
    tab: 'orders' as const,
    valueKey: 'deliveredOrders' as const,
    tone: '#15803D',
    soft: '#F0FDF4',
  },
  {
    id: 'payments',
    label: 'Payments',
    hint: 'Successful checkouts',
    icon: 'wallet',
    tab: 'payments' as const,
    valueKey: 'paymentsCount' as const,
    tone: '#BE185D',
    soft: '#FDF2F8',
  },
  {
    id: 'categories',
    label: 'Categories',
    hint: 'Active store sections',
    icon: 'grid',
    tab: null,
    valueKey: 'categoriesCount' as const,
    tone: '#475569',
    soft: '#F8FAFC',
  },
];

export function AdminHomeTab({
  adminName,
  stats,
  orders,
  bottomPadding,
  pendingUsersCount,
  onOpenTab,
  onViewStore,
  onOpenDailyPrices,
  onOpenDemandPoll,
  onOpenProductImages,
  onOpenFreshArrivals,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { isTablet, contentMaxWidth, horizontalPadding } = useResponsiveLayout();
  const firstName = adminName.split(' ')[0] || adminName;
  const deliveryRate = pct(stats.deliveredOrders, stats.ordersCount);
  const todayShare = pct(stats.revenueToday, stats.revenueTotal);

  return (
    <View style={styles.root}>
      <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />

        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text className="text-[10px] font-bold uppercase tracking-wide text-white">
                Live dashboard
              </Text>
            </View>
            <Text className="mt-3 text-sm font-semibold text-white/75">{greeting()},</Text>
            <Text className="mt-0.5 text-2xl font-bold text-white">{firstName}</Text>
            <Text className="mt-1 text-sm text-white/65">
              Community mart overview · users, orders & revenue
            </Text>
          </View>
          <View style={styles.heroActionsRow}>
            <Pressable
              accessibilityLabel="View Society Residents & Approvals"
              hitSlop={8}
              style={styles.heroBadge}
              onPress={() => onOpenTab('users')}>
              <Icon color={colors.primaryDark} name="people" size={22} />
              {pendingUsersCount && pendingUsersCount > 0 ? (
                <View style={styles.heroBadgeCount}>
                  <Text style={styles.heroBadgeCountText}>
                    {pendingUsersCount > 9 ? '9+' : pendingUsersCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityLabel="View Activity Calendar"
              hitSlop={8}
              style={styles.heroBadge}
              onPress={() => setCalendarOpen(true)}>
              <Icon color={colors.primaryDark} name="calendar" size={22} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <HeroStat label="Active now" value={String(stats.activeOrders)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Residents" value={String(stats.usersCount)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Categories" value={String(stats.categoriesCount)} />
        </View>
      </View>

      <View
        style={{
          alignSelf: 'center',
          marginTop: -40,
          maxWidth: isTablet ? contentMaxWidth : undefined,
          paddingHorizontal: horizontalPadding,
          width: '100%',
        }}>
        <View style={styles.revenueCard}>
          <View style={styles.revenueAccent} />
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Today&apos;s revenue
              </Text>
              <Text className="mt-1 text-4xl font-bold text-slate-900">
                {formatMoney(stats.revenueToday)}
              </Text>
              <Text className="mt-2 text-sm text-slate-500">
                Lifetime · {formatMoney(stats.revenueTotal)}
              </Text>
            </View>
            <View style={styles.revenueIcon}>
              <Icon color={colors.primary} name="trending-up" size={24} />
            </View>
          </View>

          <View className="mt-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-slate-500">Today vs lifetime</Text>
              <Text className="text-xs font-bold text-primary">{todayShare}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${Math.max(todayShare, 4)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.fulfillmentCard}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Fulfillment rate
              </Text>
              <Text className="mt-1 text-2xl font-bold text-slate-900">{deliveryRate}%</Text>
            </View>
            <View style={styles.fulfillmentRing}>
              <Text className="text-sm font-bold text-primary">{stats.deliveredOrders}</Text>
              <Text className="text-[10px] font-semibold text-slate-400">delivered</Text>
            </View>
          </View>

          <View style={styles.segmentBar}>
            {stats.ordersCount > 0 ? (
              <>
                <View
                  style={[
                    styles.segmentDelivered,
                    { flex: Math.max(stats.deliveredOrders, 0.001) },
                  ]}
                />
                <View
                  style={[styles.segmentActive, { flex: Math.max(stats.activeOrders, 0.001) }]}
                />
                <View
                  style={[styles.segmentPending, { flex: Math.max(stats.pendingOrders, 0.001) }]}
                />
                {stats.cancelledOrders > 0 ? (
                  <View
                    style={[
                      styles.segmentCancelled,
                      { flex: Math.max(stats.cancelledOrders, 0.001) },
                    ]}
                  />
                ) : null}
              </>
            ) : (
              <View style={[styles.segmentPending, { flex: 1 }]} />
            )}
          </View>

          <View className="mt-3 flex-row flex-wrap gap-3">
            <LegendDot color={colors.primary} label={`Delivered ${stats.deliveredOrders}`} />
            <LegendDot color="#3B82F6" label={`Active ${stats.activeOrders}`} />
            <LegendDot color="#F97316" label={`Pending ${stats.pendingOrders}`} />
            {stats.cancelledOrders > 0 ? (
              <LegendDot color="#EF4444" label={`Cancelled ${stats.cancelledOrders}`} />
            ) : null}
          </View>
        </View>

        <View className="mb-3 mt-6 flex-row items-end justify-between">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Key metrics
            </Text>
            <Text className="mt-1 text-base font-bold text-slate-900">Operations snapshot</Text>
          </View>
          <View style={styles.metricsBadge}>
            <Icon color={colors.primary} name="pulse" size={14} />
            <Text className="ml-1 text-[10px] font-bold text-primary">Live</Text>
          </View>
        </View>

        <View style={styles.featuredRow}>
          <FeaturedMetric
            hint="Community members"
            icon="people"
            label="Residents"
            tone="#063D29"
            value={String(stats.usersCount)}
            onPress={() => onOpenTab('users')}
          />
          <FeaturedMetric
            hint={`${stats.activeOrders} active now`}
            icon="receipt"
            label="Orders"
            tone="#0A5C3E"
            value={String(stats.ordersCount)}
            onPress={() => onOpenTab('orders')}
          />
        </View>

        <View style={styles.metricsPanel}>
          {METRICS.slice(2).map((metric, index) => {
            const value = String(stats[metric.valueKey]);
            const isLast = index === METRICS.slice(2).length - 1;
            return (
              <MetricRow
                key={metric.id}
                hint={metric.hint}
                icon={metric.icon}
                isLast={isLast}
                label={metric.label}
                soft={metric.soft}
                tone={metric.tone}
                value={value}
                onPress={metric.tab ? () => onOpenTab(metric.tab!) : undefined}
              />
            );
          })}
        </View>

        <View style={styles.actionsSection}>
          <View style={styles.actionsHeader}>
            <View>
              <Text style={styles.actionsEyebrow}>Shortcuts</Text>
              <Text style={styles.actionsTitle}>Quick actions</Text>
            </View>
            <Text style={styles.actionsHint}>Manage the store</Text>
          </View>

          {onOpenFreshArrivals ? (
            <Pressable style={styles.featuredAction} onPress={onOpenFreshArrivals}>
              <View style={[styles.featuredActionIcon, { backgroundColor: '#DC2626' }]}>
                <Icon color={colors.white} name="flame" size={20} />
              </View>
              <View style={styles.featuredActionBody}>
                <View className="flex-row items-center gap-2">
                  <Text style={styles.featuredActionLabel}>Fresh Arrivals</Text>
                  <View style={styles.liveActionBadge}>
                    <Text style={styles.liveActionBadgeText}>LIVE STORIES</Text>
                  </View>
                </View>
                <Text style={styles.featuredActionSub}>
                  Upload real-time photos the moment stock arrives at store
                </Text>
              </View>
              <View style={styles.featuredActionChevron}>
                <Icon color={colors.primary} name="arrow-forward" size={16} />
              </View>
            </Pressable>
          ) : null}

          {onOpenDemandPoll ? (
            <Pressable style={styles.featuredAction} onPress={onOpenDemandPoll}>
              <View style={[styles.featuredActionIcon, { backgroundColor: '#F59E0B' }]}>
                <Icon color={colors.white} name="stats-chart" size={20} />
              </View>
              <View style={styles.featuredActionBody}>
                <View className="flex-row items-center gap-2">
                  <Text style={styles.featuredActionLabel}>Tomorrow’s Demand Poll</Text>
                  <View style={[styles.liveActionBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.liveActionBadgeText, { color: '#B45309' }]}>VOTING LIVE</Text>
                  </View>
                </View>
                <Text style={styles.featuredActionSub}>
                  View resident demand (Mangoes, Avocado, Fish, Prawns) & procure
                </Text>
              </View>
              <View style={styles.featuredActionChevron}>
                <Icon color={colors.primary} name="arrow-forward" size={16} />
              </View>
            </Pressable>
          ) : null}

          <Pressable style={styles.featuredAction} onPress={onOpenDailyPrices}>
            <View style={styles.featuredActionIcon}>
              <Icon color={colors.white} name="pricetag" size={20} />
            </View>
            <View style={styles.featuredActionBody}>
              <Text style={styles.featuredActionLabel}>Daily prices</Text>
              <Text style={styles.featuredActionSub}>
                Set today's vegetable & fruit rates by date
              </Text>
            </View>
            <View style={styles.featuredActionChevron}>
              <Icon color={colors.primary} name="arrow-forward" size={16} />
            </View>
          </Pressable>

          <Pressable style={styles.featuredAction} onPress={onOpenProductImages}>
            <View style={[styles.featuredActionIcon, { backgroundColor: '#0F766E' }]}>
              <Icon color={colors.white} name="images" size={20} />
            </View>
            <View style={styles.featuredActionBody}>
              <Text style={styles.featuredActionLabel}>Product images</Text>
              <Text style={styles.featuredActionSub}>
                Main photo + front, side & back angles per item
              </Text>
            </View>
            <View style={styles.featuredActionChevron}>
              <Icon color={colors.primary} name="arrow-forward" size={16} />
            </View>
          </Pressable>

          <View style={styles.actionsGrid}>
            <ActionTile
              icon="people-outline"
              label="Users"
              subtitle="Approvals & residents"
              tone={colors.primary}
              soft="#ECFDF3"
              onPress={() => onOpenTab('users')}
            />
            <ActionTile
              icon="receipt-outline"
              label="Orders"
              subtitle={
                stats.activeOrders > 0
                  ? `${stats.activeOrders} active now`
                  : 'Order pipeline'
              }
              tone="#15803D"
              soft="#F0FDF4"
              onPress={() => onOpenTab('orders')}
            />
            <ActionTile
              icon="wallet-outline"
              label="Payments"
              subtitle="Revenue & checkouts"
              tone="#0F766E"
              soft="#F0FDFA"
              onPress={() => onOpenTab('payments')}
            />
            <ActionTile
              icon="person-outline"
              label="Account"
              subtitle="Profile & activity"
              tone="#334155"
              soft="#F8FAFC"
              onPress={() => onOpenTab('account')}
            />
          </View>

          <Pressable style={styles.storeBanner} onPress={onViewStore}>
            <View style={styles.storeBannerIcon}>
              <Icon color={colors.white} name="storefront-outline" size={20} />
            </View>
            <View style={styles.storeBannerBody}>
              <Text style={styles.storeBannerLabel}>Open customer app</Text>
              <Text style={styles.storeBannerSub}>Preview the storefront as a shopper</Text>
            </View>
            <Icon color={colors.accent} name="arrow-forward" size={18} />
          </Pressable>
        </View>
      </View>
    </ScrollView>

    <AdminActivityCalendar
      orders={orders}
      visible={calendarOpen}
      onClose={() => setCalendarOpen(false)}
    />
    </View>
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center">
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text className="ml-1.5 text-[11px] font-semibold text-slate-500">{label}</Text>
    </View>
  );
}

function FeaturedMetric({
  label,
  value,
  hint,
  icon,
  tone,
  onPress,
}: {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.featuredCard, { backgroundColor: tone }]} onPress={onPress}>
      <View style={styles.featuredIconWrap}>
        <Icon color={colors.white} name={icon} size={20} />
      </View>
      <Text className="mt-4 text-3xl font-bold text-white">{value}</Text>
      <Text className="mt-1 text-sm font-bold text-white">{label}</Text>
      <Text className="mt-0.5 text-[11px] text-white/65">{hint}</Text>
      <View className="mt-3 flex-row items-center">
        <Text className="text-[10px] font-bold text-accent">View details</Text>
        <Icon color={colors.accent} name="arrow-forward" size={12} />
      </View>
    </Pressable>
  );
}

function MetricRow({
  label,
  value,
  hint,
  icon,
  tone,
  soft,
  isLast,
  onPress,
}: {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: string;
  soft: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      style={[styles.metricRow, !isLast && styles.metricRowBorder]}
      onPress={onPress}>
      <View style={[styles.metricRowAccent, { backgroundColor: tone }]} />
      <View style={[styles.metricRowIcon, { backgroundColor: soft }]}>
        <Icon color={tone} name={icon} size={18} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-slate-900">{label}</Text>
        <Text className="mt-0.5 text-[11px] text-slate-400">{hint}</Text>
      </View>
      <View className="items-end">
        <Text className="text-xl font-bold text-slate-900">{value}</Text>
        {onPress ? <Icon color="#CBD5E1" name="chevron-forward" size={14} style={{ marginTop: 4 }} /> : null}
      </View>
    </Pressable>
  );
}

function ActionTile({
  icon,
  label,
  subtitle,
  tone,
  soft,
  onPress,
}: {
  icon: string;
  label: string;
  subtitle: string;
  tone: string;
  soft: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionTile} onPress={onPress}>
      <View style={[styles.actionTileIcon, { backgroundColor: soft }]}>
        <Icon color={tone} name={icon} size={20} />
      </View>
      <Text style={styles.actionTileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.actionTileSub} numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
    paddingBottom: 56,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'relative',
  },
  heroOrbLarge: {
    backgroundColor: 'rgba(184, 240, 74, 0.08)',
    borderRadius: 999,
    height: 180,
    position: 'absolute',
    right: -40,
    top: -30,
    width: 180,
  },
  heroOrbSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 999,
    bottom: 20,
    height: 90,
    left: -20,
    position: 'absolute',
    width: 90,
  },
  liveChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  heroActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  heroBadgeCount: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  heroBadgeCountText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  heroStatsRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    flexDirection: 'row',
    marginTop: 20,
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
    borderRadius: 24,
    borderWidth: 1,
    elevation: 6,
    overflow: 'hidden',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
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
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  progressTrack: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: 8,
  },
  fulfillmentCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  fulfillmentRing: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 999,
    borderWidth: 3,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  segmentBar: {
    borderRadius: 999,
    flexDirection: 'row',
    height: 10,
    marginTop: 16,
    overflow: 'hidden',
  },
  segmentDelivered: {
    backgroundColor: colors.primary,
  },
  segmentActive: {
    backgroundColor: '#3B82F6',
  },
  segmentPending: {
    backgroundColor: '#F97316',
  },
  segmentCancelled: {
    backgroundColor: '#EF4444',
  },
  legendDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  metricsBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featuredRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  featuredCard: {
    borderRadius: 22,
    flex: 1,
    minHeight: 160,
    padding: 16,
  },
  featuredIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  metricsPanel: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 16,
    position: 'relative',
  },
  metricRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  metricRowAccent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  metricRowIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    marginLeft: 6,
    width: 42,
  },
  actionTile: {
    backgroundColor: colors.white,
    borderColor: '#E8EEF2',
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48.5%',
    minHeight: 118,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionTileIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionTileLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  actionTileSub: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  actionsSection: {
    marginTop: 28,
  },
  actionsHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  actionsEyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actionsTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  featuredAction: {
    alignItems: 'center',
    backgroundColor: '#F3FBF6',
    borderColor: '#CDEAD9',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  featuredActionIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  featuredActionBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  featuredActionLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  featuredActionSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  featuredActionChevron: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#D8EDE2',
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  storeBanner: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  storeBannerIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  storeBannerBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  storeBannerLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  storeBannerSub: {
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: 12,
    marginTop: 2,
  },
  liveActionBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  liveActionBadgeText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
