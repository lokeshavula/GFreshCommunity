import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { calculateOrderTotal, fetchOrdersForUser } from '../../services/orderService';
import { getCurrentUser } from '../../services/userService';
import { addToCart } from '../../services/cartService';
import { GfmOrder, GfmOrderItem } from '../../types/gfm';
import {
  ORDER_TRACK_STEPS,
  getLiveTrackStepIndex,
  getTrackStepLabel,
} from '../../utils/orderTracking';
import { getImageSource } from '../../utils/imageSource';
import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  bottomPadding?: number;
  onTrackOrder: (order: GfmOrder) => void;
  onShopNow: () => void;
  onOpenCart?: () => void;
};

type FilterType = 'all' | 'active' | 'delivered' | 'cancelled';

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'layers-outline' },
  { id: 'active', label: 'Active', icon: 'flash' },
  { id: 'delivered', label: 'Delivered', icon: 'checkmark-circle-outline' },
  { id: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

function formatOrderDate(value?: string): string {
  if (!value) return 'Just now';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

function isDelivered(order: GfmOrder): boolean {
  return getLiveTrackStepIndex(order.status, order.orderedAt) >= 4 || order.status === 'delivered';
}

function isCancelled(order: GfmOrder): boolean {
  return order.status === 'cancelled';
}

function isActive(order: GfmOrder): boolean {
  return !isDelivered(order) && !isCancelled(order);
}

export function OrdersTabContent({
  bottomPadding = 120,
  onTrackOrder,
  onShopNow,
  onOpenCart,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet, pageMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [orders, setOrders] = useState<GfmOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }
      const data = await fetchOrdersForUser(user.id);
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrders();
    }, [loadOrders]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const activeOrders = useMemo(() => orders.filter(isActive), [orders]);
  const deliveredOrders = useMemo(() => orders.filter(isDelivered), [orders]);
  const cancelledOrders = useMemo(() => orders.filter(isCancelled), [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'active') return activeOrders;
    if (filter === 'delivered') return deliveredOrders;
    if (filter === 'cancelled') return cancelledOrders;
    return orders;
  }, [filter, orders, activeOrders, deliveredOrders, cancelledOrders]);

  const handleQuickReorder = async (order: GfmOrder) => {
    if (!order.items.length) return;
    setReorderingId(order.id);
    try {
      for (const item of order.items) {
        await addToCart({
          productId: item.id,
          name: item.name,
          subtitle: item.subtitle,
          price: item.price,
          unit: item.unit,
          image: item.image,
          quantity: item.quantity,
        });
      }
      Alert.alert(
        'Added to Cart',
        `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'} added to your cart.`,
        [
          { text: 'Keep Browsing', style: 'cancel' },
          ...(onOpenCart ? [{ text: 'View Cart', onPress: onOpenCart }] : []),
        ],
      );
    } catch {
      Alert.alert('Reorder', 'Could not add items to cart.');
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <ScrollView
      bounces={true}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom: bottomPadding,
          paddingHorizontal: horizontalPadding,
          paddingTop: Math.max(insets.top, 16) + 8,
          ...(isTablet ? { alignSelf: 'center', maxWidth: pageMaxWidth, width: '100%' } : null),
        },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
      style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Orders</Text>
          {activeOrders.length > 0 ? (
            <View style={styles.liveBeacon}>
              <View style={styles.beaconDot} />
              <Text style={styles.beaconText}>{activeOrders.length} active</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Track your community mart deliveries & live journey</Text>
      </View>

      {/* Active Delivery Spotlight Hero Banner if active orders exist */}
      {activeOrders.length > 0 && filter === 'all' ? (
        <Pressable
          accessibilityLabel="Track active delivery"
          accessibilityRole="button"
          style={({ pressed }) => [styles.activeHeroCard, pressed && styles.cardPressed]}
          onPress={() => onTrackOrder(activeOrders[0])}>
          <View style={styles.activeHeroTop}>
            <View style={styles.activeHeroIconCircle}>
              <Icon color="#059669" name="bicycle" size={20} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.activeHeroTitleRow}>
                <Text style={styles.activeHeroTitle}>Delivery in Progress</Text>
                <View style={styles.activeHeroLiveBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.activeHeroLiveText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.activeHeroSub} numberOfLines={1}>
                {getTrackStepLabel(activeOrders[0].status)} • Flat {activeOrders[0].flatNo}
              </Text>
            </View>
            <View style={styles.activeHeroTrackBtn}>
              <Text style={styles.activeHeroTrackText}>Track</Text>
              <Icon color="#059669" name="chevron-forward" size={14} />
            </View>
          </View>

          {/* Mini 4-step progress dots */}
          <View style={styles.miniProgressRow}>
            {ORDER_TRACK_STEPS.slice(0, 4).map((step, sIdx) => {
              const currentIdx = getLiveTrackStepIndex(
                activeOrders[0].status,
                activeOrders[0].orderedAt,
              );
              const isPast = sIdx < currentIdx;
              const isCurrent = sIdx === currentIdx;
              return (
                <React.Fragment key={step.id}>
                  <View
                    style={[
                      styles.miniDot,
                      isPast && styles.miniDotPast,
                      isCurrent && styles.miniDotCurrent,
                    ]}>
                    <Icon
                      color={isPast || isCurrent ? '#FFFFFF' : '#94A3B8'}
                      name={isPast ? 'checkmark' : step.icon}
                      size={9}
                    />
                  </View>
                  {sIdx < 3 ? (
                    <View
                      style={[
                        styles.miniLine,
                        (isPast || isCurrent) && styles.miniLineActive,
                      ]}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
        </Pressable>
      ) : null}

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterWrapper}>
        {FILTERS.map(tab => {
          const active = filter === tab.id;
          let count = orders.length;
          if (tab.id === 'active') count = activeOrders.length;
          if (tab.id === 'delivered') count = deliveredOrders.length;
          if (tab.id === 'cancelled') count = cancelledOrders.length;

          return (
            <Pressable
              key={tab.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(tab.id)}>
              <Icon
                color={active ? '#FFFFFF' : '#64748B'}
                name={tab.icon}
                size={13}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon color="#94A3B8" name="bag-handle-outline" size={48} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Your fresh mart deliveries will appear here.</Text>
          <Pressable
            style={({ pressed }) => [styles.shopBtn, pressed && styles.btnPressed]}
            onPress={onShopNow}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
            <Icon color="#FFFFFF" name="arrow-forward" size={15} style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No {filter} orders</Text>
        </View>
      ) : (
        /* Rich, Sleek Orders List */
        <View style={styles.ordersList}>
          {filteredOrders.map(order => {
            const activeDelivery = isActive(order);
            const total = calculateOrderTotal(order.items);
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const stepIndex = getLiveTrackStepIndex(order.status, order.orderedAt);

            const statusLabel = isCancelled(order)
              ? 'Cancelled'
              : isDelivered(order)
                ? 'Delivered'
                : ORDER_TRACK_STEPS[Math.max(stepIndex, 0)]?.title ?? getTrackStepLabel(order.status);

            const isOrderPacking = order.status === 'packing';
            const isOrderOut = order.status === 'out_for_delivery' || order.status === 'delivery_ready';

            return (
              <Pressable
                key={order.id}
                accessibilityLabel={`Order ${order.orderId}, ${statusLabel}`}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.orderCard,
                  isDelivered(order) && styles.orderCardDelivered,
                  activeDelivery && styles.orderCardActive,
                  isCancelled(order) && styles.orderCardCancelled,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onTrackOrder(order)}>
                {/* Card Top Row: Status Pill & Date */}
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.statusPill,
                      isOrderPacking && styles.statusPillPacking,
                      isOrderOut && styles.statusPillActive,
                      isDelivered(order) && styles.statusPillDelivered,
                      isCancelled(order) && styles.statusPillCancelled,
                    ]}>
                    <Icon
                      color={
                        isCancelled(order)
                          ? '#DC2626'
                          : isDelivered(order)
                            ? '#059669'
                            : isOrderPacking
                              ? '#D97706'
                              : '#047857'
                      }
                      name={
                        isCancelled(order)
                          ? 'close-circle'
                          : isDelivered(order)
                            ? 'checkmark-circle'
                            : isOrderPacking
                              ? 'cube-outline'
                              : 'bicycle'
                      }
                      size={13}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isOrderPacking && styles.statusPillTextPacking,
                        isOrderOut && styles.statusPillTextActive,
                        isDelivered(order) && styles.statusPillTextDelivered,
                        isCancelled(order) && styles.statusPillTextCancelled,
                      ]}>
                      {statusLabel}
                    </Text>
                  </View>

                  <Text style={styles.orderDate}>{formatOrderDate(order.orderedAt)}</Text>
                </View>

                {/* Destination info pill with soft emerald accent */}
                <View style={styles.destinationPill}>
                  <Icon color="#059669" name="location" size={11} style={{ marginRight: 4 }} />
                  <Text style={styles.destinationText}>
                    Flat {order.flatNo}{order.blockNumber ? `, Block ${order.blockNumber}` : ''}
                  </Text>
                  {order.deliverySlot ? (
                    <>
                      <View style={styles.destinationDot} />
                      <Text style={styles.destinationSlot}>{order.deliverySlot}</Text>
                    </>
                  ) : null}
                </View>

                {/* Visual Thumbnails Strip */}
                <View style={styles.thumbnailStrip}>
                  <View style={styles.thumbnailRow}>
                    {order.items.slice(0, 4).map((item: GfmOrderItem, idx: number) => (
                      <View key={`${item.id}-${idx}`} style={styles.thumbBox}>
                        {item.image ? (
                          <Image
                            fadeDuration={0}
                            resizeMode="contain"
                            source={getImageSource(item.image)}
                            style={styles.thumbImg}
                          />
                        ) : (
                          <View style={styles.thumbFallbackCircle}>
                            <Icon color="#059669" name="basket-outline" size={16} />
                          </View>
                        )}
                        {item.quantity > 1 ? (
                          <View style={styles.qtyBadge}>
                            <Text style={styles.qtyBadgeText}>×{item.quantity}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}

                    {order.items.length > 4 ? (
                      <View style={styles.moreThumbBox}>
                        <Text style={styles.moreThumbText}>+{order.items.length - 4}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Items Summary Text */}
                <View style={styles.itemsSummaryRow}>
                  <Text numberOfLines={1} style={styles.itemSummaryText}>
                    {order.items.map(i => i.name).join(', ')}
                  </Text>
                  <Text style={styles.itemCountText}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                {/* If active: mini live journey status bar */}
                {activeDelivery ? (
                  <View style={styles.activeStatusBar}>
                    <View style={styles.activeStatusBarLeft}>
                      <View style={styles.activePulseSmall} />
                      <Text style={styles.activeStatusBarText}>
                        Live Tracking • Step {Math.min(stepIndex + 1, 4)} of 4
                      </Text>
                    </View>
                    <Text style={styles.activeStatusBarAction}>View Journey ›</Text>
                  </View>
                ) : null}

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Card Footer: Price, Order ID, and Action Buttons */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.priceAmount}>₹{total.toFixed(0)}</Text>
                    <Text style={styles.orderIdTag}>#{order.orderId.slice(-7)}</Text>
                  </View>

                  <View style={styles.footerActions}>
                    {!isCancelled(order) ? (
                      <Pressable
                        accessibilityLabel="Reorder all items"
                        disabled={reorderingId === order.id}
                        hitSlop={6}
                        style={({ pressed }) => [styles.reorderBtn, pressed && styles.btnPressed]}
                        onPress={e => {
                          e.stopPropagation?.();
                          handleQuickReorder(order);
                        }}>
                        {reorderingId === order.id ? (
                          <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                          <>
                            <Icon color="#059669" name="repeat" size={13} style={{ marginRight: 4 }} />
                            <Text style={styles.reorderBtnText}>Reorder</Text>
                          </>
                        )}
                      </Pressable>
                    ) : null}

                    <View
                      style={[
                        styles.detailsBtn,
                        activeDelivery && styles.detailsBtnActive,
                      ]}>
                      <Text
                        style={[
                          styles.detailsBtnText,
                          activeDelivery && styles.detailsBtnTextActive,
                        ]}>
                        {activeDelivery ? 'Track' : 'Details'}
                      </Text>
                      <Icon
                        color={activeDelivery ? '#FFFFFF' : '#334155'}
                        name="chevron-forward"
                        size={13}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '400',
    marginTop: 2,
  },
  liveBeacon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  beaconDot: {
    backgroundColor: '#16A34A',
    borderRadius: 999,
    height: 6,
    marginRight: 4,
    width: 6,
  },
  beaconText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  /* Active Hero Showcase Card */
  activeHeroCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 14,
    padding: 13,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  activeHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  activeHeroIconCircle: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  activeHeroTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  activeHeroTitle: {
    color: '#065F46',
    fontSize: 13.5,
    fontWeight: '700',
  },
  activeHeroLiveBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    flexDirection: 'row',
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  livePulseDot: {
    backgroundColor: '#16A34A',
    borderRadius: 999,
    height: 5,
    marginRight: 3,
    width: 5,
  },
  activeHeroLiveText: {
    color: '#15803D',
    fontSize: 8.5,
    fontWeight: '700',
  },
  activeHeroSub: {
    color: '#047857',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  activeHeroTrackBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#A7F3D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeHeroTrackText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '700',
    marginRight: 2,
  },
  miniProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  miniDot: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    width: 18,
    zIndex: 2,
  },
  miniDotPast: {
    backgroundColor: colors.primary,
  },
  miniDotCurrent: {
    backgroundColor: '#059669',
    elevation: 1,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  miniLine: {
    backgroundColor: '#E2E8F0',
    flex: 1,
    height: 2,
    marginHorizontal: 2,
  },
  miniLineActive: {
    backgroundColor: '#86EFAC',
  },
  /* Filters */
  filterWrapper: {
    marginBottom: 14,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  filterChipText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    marginLeft: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterBadgeText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 84,
    justifyContent: 'center',
    marginBottom: 14,
    width: 84,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
  shopBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    elevation: 2,
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.75,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 10,
  },
  ordersList: {
    gap: 12,
  },
  /* Order Card */
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderLeftColor: '#CBD5E1',
    borderLeftWidth: 3.5,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 1,
    overflow: 'hidden',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  orderCardDelivered: {
    borderLeftColor: '#10B981',
  },
  orderCardActive: {
    backgroundColor: '#FCFDFD',
    borderColor: '#86EFAC',
    borderLeftColor: '#059669',
    borderLeftWidth: 3.5,
    borderWidth: 1.2,
    shadowColor: '#059669',
    shadowOpacity: 0.08,
  },
  orderCardCancelled: {
    borderLeftColor: '#F87171',
  },
  cardPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.99 }],
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
  },
  statusPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 0.8,
  },
  statusPillPacking: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 0.8,
  },
  statusPillDelivered: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 0.8,
  },
  statusPillCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 0.8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusPillTextActive: {
    color: '#047857',
  },
  statusPillTextPacking: {
    color: '#B45309',
  },
  statusPillTextDelivered: {
    color: '#059669',
  },
  statusPillTextCancelled: {
    color: '#DC2626',
  },
  orderDate: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '400',
  },
  destinationPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderRadius: 6,
    borderWidth: 0.8,
    flexDirection: 'row',
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  destinationText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '500',
  },
  destinationDot: {
    backgroundColor: '#86EFAC',
    borderRadius: 999,
    height: 3,
    marginHorizontal: 5,
    width: 3,
  },
  destinationSlot: {
    color: '#047857',
    fontSize: 10.5,
    fontWeight: '400',
  },
  /* Thumbnails */
  thumbnailStrip: {
    marginTop: 10,
  },
  thumbnailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  thumbBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 44,
  },
  thumbFallbackCircle: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  thumbImg: {
    height: '84%',
    width: '84%',
  },
  qtyBadge: {
    backgroundColor: '#0F172A',
    borderRadius: 5,
    bottom: 2,
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    position: 'absolute',
    right: 2,
  },
  qtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '600',
  },
  moreThumbBox: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  moreThumbText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
  },
  /* Summary */
  itemsSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  itemSummaryText: {
    color: '#334155',
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    paddingRight: 8,
  },
  itemCountText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '400',
  },
  /* Active live status mini bar */
  activeStatusBar: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 8,
    borderWidth: 0.8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeStatusBarLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  activePulseSmall: {
    backgroundColor: '#16A34A',
    borderRadius: 999,
    height: 6,
    marginRight: 6,
    width: 6,
  },
  activeStatusBarText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '500',
  },
  activeStatusBarAction: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
  },
  /* Divider */
  cardDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginVertical: 10,
  },
  /* Footer */
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceAmount: {
    color: '#0F172A',
    fontSize: 15.5,
    fontWeight: '600',
  },
  orderIdTag: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '400',
    marginTop: 1,
  },
  footerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reorderBtn: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
  },
  reorderBtnText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '500',
  },
  detailsBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
  },
  detailsBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  detailsBtnText: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '500',
    marginRight: 2,
  },
  detailsBtnTextActive: {
    color: '#FFFFFF',
  },
});
