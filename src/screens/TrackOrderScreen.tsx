import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/AppNavigator';
import { calculateOrderTotal, fetchOrderByOrderId } from '../services/orderService';
import { addToCart } from '../services/cartService';
import { GfmOrder, GfmOrderItem } from '../types/gfm';
import {
  ORDER_TRACK_STEPS,
  getLiveTrackStepIndex,
  getTrackStepLabel,
} from '../utils/orderTracking';
import { getImageSource } from '../utils/imageSource';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackOrder'>;

function formatFullDate(value?: string): string {
  if (!value) return 'Just now';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function TrackOrderScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet, pageMaxWidth, horizontalPadding } = useResponsiveLayout();
  const {
    orderId,
    deliverySlot,
    deliveryTime,
    blockNumber,
    flatNo,
    status: initialStatus = 'placed',
    orderedAt,
    initialOrder,
  } = route.params;

  const [order, setOrder] = useState<GfmOrder | null>(initialOrder ?? null);
  const [loading, setLoading] = useState(!initialOrder);
  const [tick, setTick] = useState(0);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetchOrderByOrderId(orderId).then(result => {
      if (mounted) {
        if (result) setOrder(result);
        setLoading(false);
      }
    });

    const poll = setInterval(() => {
      fetchOrderByOrderId(orderId).then(result => {
        if (mounted && result) {
          setOrder(result);
        }
      });
      setTick(value => value + 1);
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [orderId]);

  const status = order?.status ?? initialStatus;
  const orderedAtValue = order?.orderedAt ?? orderedAt;
  const destinationBlock = order?.blockNumber ?? blockNumber ?? '—';
  const destinationFlat = order?.flatNo ?? flatNo ?? '—';
  const slot = order?.deliverySlot ?? deliverySlot;
  const time = order?.deliveryTime ?? deliveryTime;
  const items = order?.items ?? [];

  const activeIndex = useMemo(
    () => getLiveTrackStepIndex(status, orderedAtValue),
    [status, orderedAtValue, tick],
  );

  const isCancelled = status === 'cancelled';
  const isDone = activeIndex >= 4 || status === 'delivered';
  const isEnRoute = !isCancelled && !isDone;

  const currentStepTitle = isCancelled
    ? 'Order Cancelled'
    : isDone
      ? 'Order Delivered'
      : ORDER_TRACK_STEPS[Math.max(activeIndex, 0)]?.title ?? getTrackStepLabel(status);

  const orderTotal = useMemo(() => calculateOrderTotal(items), [items]);
  const totalMrp = useMemo(
    () => items.reduce((acc, it) => acc + Math.round(it.price * 1.25) * it.quantity, 0),
    [items],
  );
  const totalSavings = useMemo(() => Math.max(0, totalMrp - orderTotal), [totalMrp, orderTotal]);

  const handleReorder = async () => {
    if (items.length === 0) return;
    setReordering(true);
    try {
      for (const item of items) {
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
        'Cart Updated',
        'All items from this order have been added to your cart.',
        [
          { text: 'Keep Browsing', style: 'cancel' },
          { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
        ],
      );
    } catch {
      Alert.alert('Reorder', 'Could not add items to cart.');
    } finally {
      setReordering(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <Pressable
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          onPress={() => navigation.goBack()}>
          <Icon color="#0F172A" name="arrow-back" size={20} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSub}>{orderId}</Text>
        </View>

        <View
          style={[
            styles.headerStatusBadge,
            isEnRoute && styles.headerStatusActive,
            isDone && styles.headerStatusDone,
            isCancelled && styles.headerStatusCancelled,
          ]}>
          <Text
            style={[
              styles.headerStatusText,
              isEnRoute && styles.headerStatusTextActive,
              isDone && styles.headerStatusTextDone,
              isCancelled && styles.headerStatusTextCancelled,
            ]}>
            {isDone ? 'Delivered' : isCancelled ? 'Cancelled' : 'Live'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading order details…</Text>
        </View>
      ) : (
        <ScrollView
          bounces={true}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: insets.bottom + 100,
              ...(isTablet ? { alignSelf: 'center', maxWidth: pageMaxWidth, width: '100%' } : null),
            },
          ]}
          showsVerticalScrollIndicator={false}>
          {/* Status Hero Card */}
          <View
            style={[
              styles.heroBanner,
              isEnRoute && styles.heroBannerActive,
              isDone && styles.heroBannerDone,
              isCancelled && styles.heroBannerCancelled,
            ]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconCircle}>
                <Icon
                  color={
                    isEnRoute
                      ? '#059669'
                      : isDone
                        ? '#059669'
                        : '#DC2626'
                  }
                  name={
                    isEnRoute
                      ? 'bicycle'
                      : isDone
                        ? 'checkmark-done-circle'
                        : 'alert-circle'
                  }
                  size={24}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.heroStatusTitle}>{currentStepTitle}</Text>
                <Text style={styles.heroStatusSub}>
                  {isDone
                    ? `Successfully handed over at Flat ${destinationFlat}`
                    : isCancelled
                      ? 'This order was cancelled'
                      : `Arriving today • Block ${destinationBlock}, Flat ${destinationFlat}`}
                </Text>
              </View>
            </View>

            {isEnRoute ? (
              <View style={styles.etaBar}>
                <Icon color="#065F46" name="time" size={14} style={{ marginRight: 5 }} />
                <Text style={styles.etaBarText}>Estimated arrival: 10 - 15 mins</Text>
              </View>
            ) : null}
          </View>

          {/* Live Journey Timeline Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon color={colors.primary} name="trail-sign-outline" size={18} />
              <Text style={styles.cardTitle}>Live Journey Timeline</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.timelineList}>
              {ORDER_TRACK_STEPS.map((step, index) => {
                const done = !isCancelled && index < activeIndex;
                const active = !isCancelled && index === activeIndex;
                const upcoming = isCancelled || index > activeIndex;
                const isLast = index === ORDER_TRACK_STEPS.length - 1;

                return (
                  <View key={step.id} style={styles.timelineRow}>
                    {/* Rail / Line */}
                    <View style={styles.timelineRailCol}>
                      <View
                        style={[
                          styles.timelineDot,
                          done && styles.timelineDotDone,
                          active && styles.timelineDotActive,
                          upcoming && styles.timelineDotUpcoming,
                        ]}>
                        <Icon
                          color={active || done ? '#FFFFFF' : '#94A3B8'}
                          name={done ? 'checkmark' : step.icon}
                          size={12}
                        />
                      </View>
                      {!isLast ? (
                        <View
                          style={[
                            styles.timelineLine,
                            (done || active) && styles.timelineLineActive,
                          ]}
                        />
                      ) : null}
                    </View>

                    {/* Step Content */}
                    <View style={[styles.timelineContent, !isLast && styles.timelineContentSpaced]}>
                      <View style={styles.stepTitleRow}>
                        <Text
                          style={[
                            styles.stepTitle,
                            active && styles.stepTitleActive,
                            done && styles.stepTitleDone,
                            upcoming && styles.stepTitleUpcoming,
                          ]}>
                          {step.title}
                        </Text>
                        {active ? (
                          <View style={styles.stepLivePill}>
                            <View style={styles.stepLiveDot} />
                            <Text style={styles.stepLivePillText}>NOW</Text>
                          </View>
                        ) : done ? (
                          <Text style={styles.stepDoneLabel}>Completed</Text>
                        ) : null}
                      </View>
                      <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Delivery Address & Schedule Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon color={colors.primary} name="location-outline" size={18} />
              <Text style={styles.cardTitle}>Delivery Details</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>
                Block {destinationBlock}, Flat {destinationFlat}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Slot</Text>
              <Text style={styles.detailValue}>
                {slot} • {time}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Placed</Text>
              <Text style={styles.detailValue}>{formatFullDate(orderedAtValue)}</Text>
            </View>

            {order?.instructions ? (
              <View style={styles.instructionsBox}>
                <Icon color="#0284C7" name="document-text-outline" size={15} style={{ marginRight: 6 }} />
                <Text style={styles.instructionsText}>
                  Note: {order.instructions}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Items in this Order Card */}
          {items.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Icon color={colors.primary} name="basket-outline" size={18} />
                <Text style={styles.cardTitle}>Items Ordered</Text>
                <Text style={styles.itemCountHeader}>{items.length} items</Text>
              </View>

              <View style={styles.divider} />

              {items.map((item: GfmOrderItem, idx: number) => {
                const itemTotal = item.price * item.quantity;
                const isLast = idx === items.length - 1;

                return (
                  <View key={`${item.id}-${idx}`} style={[styles.orderItemRow, !isLast && styles.orderItemBorder]}>
                    <View style={styles.itemImageStage}>
                      {item.image ? (
                        <Image
                          fadeDuration={0}
                          resizeMode="contain"
                          source={getImageSource(item.image)}
                          style={styles.itemThumb}
                        />
                      ) : (
                        <Icon color={colors.primary} name="basket-outline" size={24} />
                      )}
                    </View>

                    <View style={styles.itemInfoCol}>
                      <Text style={styles.orderItemName}>{item.name}</Text>
                      <Text style={styles.orderItemUnit}>
                        {item.unit ? `1 ${item.unit}` : '1 pack'} · ₹{item.price} each
                      </Text>
                    </View>

                    <View style={styles.itemQtyPriceCol}>
                      <View style={styles.qtyPill}>
                        <Text style={styles.qtyPillText}>× {item.quantity}</Text>
                      </View>
                      <Text style={styles.itemTotalPrice}>₹{itemTotal.toFixed(0)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Bill Receipt Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon color="#0F172A" name="receipt-outline" size={18} />
              <Text style={styles.cardTitle}>Bill Summary</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.billLine}>
              <Text style={styles.billLabel}>Item Total (MRP)</Text>
              <Text style={styles.billValMuted}>₹{totalMrp.toFixed(2)}</Text>
            </View>

            <View style={styles.billLine}>
              <Text style={styles.billLabel}>Community Discount</Text>
              <Text style={styles.billValSavings}>- ₹{totalSavings.toFixed(2)}</Text>
            </View>

            <View style={styles.billLine}>
              <View style={styles.feeWrap}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <View style={styles.freeChip}>
                  <Text style={styles.freeChipText}>FREE</Text>
                </View>
              </View>
              <Text style={styles.billValStrike}>₹25.00</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.billTotalLine}>
              <Text style={styles.billTotalLabel}>Total Paid</Text>
              <Text style={styles.billTotalAmount}>₹{orderTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Help & Support Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon color={colors.primary} name="chatbubble-ellipses-outline" size={18} />
              <Text style={styles.cardTitle}>Community Mart Support</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.supportRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.supportTitle}>Need help with this order?</Text>
                <Text style={styles.supportSub}>
                  Our community store coordinator is available for any questions or delivery requests.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.supportBtn, pressed && styles.btnPressed]}
                onPress={() => {
                  Alert.alert(
                    'Mart Support',
                    `Order ${orderId}\nDestination: Flat ${destinationFlat}, Block ${destinationBlock}\n\nOur team is ready to help!`,
                    [{ text: 'OK' }],
                  );
                }}>
                <Icon color="#059669" name="headset" size={14} style={{ marginRight: 4 }} />
                <Text style={styles.supportBtnText}>Get Help</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Floating Bottom Reorder & Action Bar */}
      {!loading && items.length > 0 ? (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: horizontalPadding,
              ...(isTablet ? { alignSelf: 'center', maxWidth: pageMaxWidth, width: '100%' } : null),
            },
          ]}>
          <Pressable
            accessibilityLabel="Reorder all items"
            disabled={reordering}
            style={({ pressed }) => [styles.reorderMainBtn, pressed && styles.btnPressed]}
            onPress={handleReorder}>
            {reordering ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon color="#FFFFFF" name="repeat" size={16} style={{ marginRight: 6 }} />
                <Text style={styles.reorderMainBtnText}>Reorder Items</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerSub: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '400',
    marginTop: 1,
  },
  headerStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  headerStatusActive: {
    backgroundColor: '#DCFCE7',
  },
  headerStatusDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  headerStatusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerStatusTextActive: {
    color: '#15803D',
  },
  headerStatusTextDone: {
    color: '#059669',
  },
  headerStatusTextCancelled: {
    color: '#B91C1C',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 12,
  },
  scrollContent: {
    paddingTop: 14,
    gap: 12,
  },
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  heroBannerActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  heroBannerDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  heroBannerCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  heroIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
    elevation: 1,
  },
  heroStatusTitle: {
    color: '#0F172A',
    fontSize: 15.5,
    fontWeight: '600',
  },
  heroStatusSub: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '400',
    marginTop: 2,
  },
  etaBar: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  etaBarText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginLeft: 8,
  },
  itemCountHeader: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 'auto',
  },
  divider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginVertical: 12,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineRailCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22,
    zIndex: 2,
  },
  timelineDotDone: {
    backgroundColor: colors.primary,
  },
  timelineDotActive: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineDotUpcoming: {
    backgroundColor: '#F1F5F9',
  },
  timelineLine: {
    backgroundColor: '#E2E8F0',
    flex: 1,
    width: 2,
  },
  timelineLineActive: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 10,
  },
  timelineContentSpaced: {
    paddingBottom: 20,
  },
  stepTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  stepTitleActive: {
    color: '#065F46',
    fontWeight: '600',
  },
  stepTitleDone: {
    color: '#0F172A',
  },
  stepTitleUpcoming: {
    color: '#94A3B8',
  },
  stepLivePill: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    flexDirection: 'row',
    marginLeft: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  stepLiveDot: {
    backgroundColor: '#16A34A',
    borderRadius: 999,
    height: 5,
    marginRight: 4,
    width: 5,
  },
  stepLivePillText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '600',
  },
  stepDoneLabel: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 8,
  },
  stepSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '400',
    marginTop: 2,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '400',
  },
  detailValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '500',
  },
  instructionsBox: {
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    padding: 10,
  },
  instructionsText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '400',
  },
  orderItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 9,
  },
  orderItemBorder: {
    borderBottomColor: '#F8FAFC',
    borderBottomWidth: 1,
  },
  itemImageStage: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  itemThumb: {
    height: 38,
    width: 38,
  },
  itemInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  orderItemName: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '500',
  },
  orderItemUnit: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  itemQtyPriceCol: {
    alignItems: 'flex-end',
  },
  qtyPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyPillText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
  itemTotalPrice: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 3,
  },
  billLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '400',
  },
  billValMuted: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '400',
  },
  billValSavings: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '500',
  },
  feeWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  freeChip: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  freeChipText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '500',
  },
  billValStrike: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '400',
    textDecorationLine: 'line-through',
  },
  billTotalLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  billTotalLabel: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '500',
  },
  billTotalAmount: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  supportRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supportTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '500',
  },
  supportSub: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '400',
    marginTop: 2,
  },
  supportBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  supportBtnText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '500',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 20,
    left: 0,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    zIndex: 100,
  },
  reorderMainBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    elevation: 3,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: '100%',
  },
  reorderMainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
