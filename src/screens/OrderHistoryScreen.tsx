import { useCallback, useMemo, useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import { calculateOrderTotal, fetchOrdersForUser } from '../services/orderService';
import { addToCart } from '../services/cartService';
import { getCurrentUser } from '../services/userService';
import { GfmOrder, GfmOrderItem } from '../types/gfm';
import { getImageSource } from '../utils/imageSource';
import {
  ORDER_TRACK_STEPS,
  getLiveTrackStepIndex,
  getTrackStepLabel,
} from '../utils/orderTracking';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderHistory'>;
type FilterId = 'all' | 'active' | 'delivered' | 'cancelled';

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

function formatOrderDate(value?: string): string {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

export function OrderHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    paddingTop: 16,
    paddingBottom: insets.bottom + 28,
  });
  const [orders, setOrders] = useState<GfmOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const handleReorder = async (order: GfmOrder) => {
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
        `All items from ${order.orderId} have been added to your cart.`,
        [
          { text: 'Keep Browsing', style: 'cancel' },
          { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
        ],
      );
    } catch {
      Alert.alert('Reorder', 'Could not re-add items to cart.');
    } finally {
      setReorderingId(null);
    }
  };

  const loadOrders = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      setOrders([]);
      setLoading(false);
      navigation.replace('Login');
      return;
    }

    const data = await fetchOrdersForUser(user.id);
    setOrders(data);
    setLoading(false);
  }, [navigation]);

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

  const filteredOrders = useMemo(() => {
    if (filter === 'active') {
      return orders.filter(isActive);
    }
    if (filter === 'delivered') {
      return orders.filter(isDelivered);
    }
    if (filter === 'cancelled') {
      return orders.filter(isCancelled);
    }
    return orders;
  }, [filter, orders]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + calculateOrderTotal(order.items), 0);
    return {
      total: orders.length,
      active: orders.filter(isActive).length,
      delivered: orders.filter(isDelivered).length,
      spent: totalSpent,
    };
  }, [orders]);

  const openTrack = (order: GfmOrder) => {
    navigation.navigate('TrackOrder', {
      orderId: order.orderId,
      deliverySlot: order.deliverySlot,
      deliveryTime: order.deliveryTime,
      blockNumber: order.blockNumber,
      flatNo: order.flatNo,
      orderedAt: order.orderedAt,
      status: order.status,
    });
  };

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Your mart-to-flat deliveries"
        title="Order history"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={contentStyle}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{stats.spent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}>
            {FILTERS.map(item => {
              const active = filter === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(item.id)}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon color={colors.primary} name="receipt-outline" size={28} />
              </View>
              <Text className="mt-4 text-base font-bold text-slate-900">No orders found</Text>
              <Text className="mt-2 text-center text-sm text-slate-500">
                {orders.length === 0
                  ? 'Your community mart orders will appear here.'
                  : 'Nothing in this filter yet.'}
              </Text>
              {orders.length === 0 ? (
                <Pressable
                  style={styles.shopButton}
                  onPress={() =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Home', params: { activeTab: 'home' } }],
                    })
                  }>
                  <Text className="text-sm font-bold text-white">Start shopping</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {filteredOrders.map(order => {
                const stepIndex = getLiveTrackStepIndex(order.status, order.orderedAt);
                const statusLabel = isCancelled(order)
                  ? 'Cancelled'
                  : ORDER_TRACK_STEPS[Math.max(stepIndex, 0)]?.title ?? getTrackStepLabel(order.status);
                const total = calculateOrderTotal(order.items);
                const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                const previewNames = order.items
                  .slice(0, 2)
                  .map(item => item.name)
                  .join(', ');
                const progress = isCancelled(order)
                  ? 0
                  : Math.max(0, Math.min(1, (stepIndex + 1) / ORDER_TRACK_STEPS.length));

                return (
                  <Pressable key={order.id} style={styles.orderCard} onPress={() => openTrack(order)}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-bold text-slate-900">{order.orderId}</Text>
                        <Text className="mt-1 text-xs text-slate-500">{formatOrderDate(order.orderedAt)}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          isCancelled(order) && styles.statusCancelled,
                          isDelivered(order) && styles.statusDelivered,
                        ]}>
                        <Text
                          style={[
                            styles.statusText,
                            isCancelled(order) && styles.statusTextCancelled,
                          ]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Visual Item Thumbnails Strip */}
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
                              <Icon color={colors.primary} name="basket-outline" size={16} />
                            )}
                            {item.quantity > 1 ? (
                              <View style={styles.qtyBadge}>
                                <Text style={styles.qtyBadgeText}>×{item.quantity}</Text>
                              </View>
                            ) : null}
                          </View>
                        ))}
                        {order.items.length > 4 ? (
                          <View style={styles.moreBox}>
                            <Text style={styles.moreText}>+{order.items.length - 4}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-2 text-xs text-slate-600" numberOfLines={1}>
                        {previewNames}
                        {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                      </Text>
                      <Text className="mt-1 text-[11px] text-slate-500">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'} · Block {order.blockNumber}, Flat {order.flatNo}
                      </Text>
                    </View>

                    {!isCancelled(order) ? (
                      <View className="mt-3">
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <Text className="mt-1.5 text-[11px] text-slate-500">
                          Mart → Flat · {Math.round(progress * 100)}% complete
                        </Text>
                      </View>
                    ) : null}

                    <View className="mt-4 flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs text-slate-500">
                          {order.deliverySlot} · {order.deliveryTime}
                        </Text>
                        <Text className="mt-1 text-base font-bold text-slate-900">₹{total.toFixed(0)}</Text>
                      </View>
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <Pressable
                          hitSlop={4}
                          style={styles.reorderBtn}
                          disabled={reorderingId === order.id}
                          onPress={() => handleReorder(order)}>
                          {reorderingId === order.id ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                          ) : (
                            <>
                              <Icon color={colors.primary} name="repeat" size={13} style={{ marginRight: 4 }} />
                              <Text style={styles.reorderBtnText}>Reorder</Text>
                            </>
                          )}
                        </Pressable>
                        <View style={styles.trackButton}>
                          <Icon color={colors.primaryDark} name="navigate" size={14} />
                          <Text className="ml-1.5 text-xs font-bold text-primary-dark">Track</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  statsCard: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  statDivider: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    height: 28,
    width: 1,
  },
  filterScroll: {
    marginBottom: 16,
    marginTop: 16,
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  shopButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  statusPill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDelivered: {
    backgroundColor: '#DCFCE7',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextCancelled: {
    color: '#B91C1C',
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: '100%',
  },
  trackButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thumbnailStrip: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    marginTop: 10,
    paddingVertical: 10,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  thumbImg: {
    height: 32,
    width: 32,
  },
  qtyBadge: {
    backgroundColor: '#0F172A',
    borderRadius: 999,
    bottom: -3,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    position: 'absolute',
    right: -3,
  },
  qtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  moreBox: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  moreText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '800',
  },
  reorderBtn: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reorderBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
