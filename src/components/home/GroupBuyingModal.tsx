import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { GroupBuyingPool } from '../../types/groupBuying';
import {
  fetchActiveGroupPools,
  joinGroupPool,
  leaveGroupPool,
} from '../../services/groupBuyingService';

export function GroupBuyingModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [pools, setPools] = useState<GroupBuyingPool[]>([]);
  const [selectedPoolIndex, setSelectedPoolIndex] = useState(0);
  const [selectedQty, setSelectedQty] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progressAnim = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const loadPools = async () => {
    setIsLoading(true);
    try {
      const data = await fetchActiveGroupPools();
      setPools(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadPools();
    }
  }, [visible]);

  const safeIndex = Math.min(selectedPoolIndex, Math.max(0, pools.length - 1));
  const activePool = pools[safeIndex];

  useEffect(() => {
    if (activePool) {
      const initialQty = activePool.userJoinedQuantity > 0 ? activePool.userJoinedQuantity : 1;
      setSelectedQty(initialQty);
      const pct = Math.min(100, Math.round((activePool.filledSlots / activePool.totalSlots) * 100));
      progressAnim.value = withTiming(pct, { duration: 450 });
    }
  }, [activePool, progressAnim]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (!visible) return null;

  if (isLoading) {
    return (
      <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={styles.scrim} onPress={onClose} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.dragPill} />
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingText}>Loading group deals...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!activePool || pools.length === 0) {
    return (
      <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={styles.scrim} onPress={onClose} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.dragPill} />
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text style={styles.headerTitle}>Group Buying</Text>
                <Text style={styles.headerSub}>Pool crates with neighbours to save wholesale</Text>
              </View>
              <Pressable hitSlop={10} style={styles.closeBtn} onPress={onClose}>
                <Icon color="#64748B" name="close" size={18} />
              </Pressable>
            </View>
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 32 }}>📦</Text>
              <Text style={styles.emptyTitle}>No Active Deals Right Now</Text>
              <Text style={styles.emptySub}>
                Community bulk crate deals are updated daily. Check back soon or tap retry!
              </Text>
              <Pressable style={styles.retryBtn} onPress={loadPools}>
                <Icon color="#FFFFFF" name="refresh" size={15} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const remainingSlots = Math.max(0, activePool.totalSlots - activePool.filledSlots);
  const maxAvailableForUser = activePool.userJoinedQuantity > 0
    ? remainingSlots + activePool.userJoinedQuantity
    : remainingSlots;
  const maxAllowed = Math.min(activePool.maxOrderQtyPerUser, maxAvailableForUser);

  const hasJoined = activePool.userJoinedQuantity > 0;
  const isPoolFull = activePool.filledSlots >= activePool.totalSlots;
  const savingsPerUnit = activePool.originalPrice - activePool.groupPrice;
  const totalLinePrice = activePool.groupPrice * selectedQty;
  const totalSavings = savingsPerUnit * selectedQty;
  const discountPercent = Math.round((savingsPerUnit / activePool.originalPrice) * 100);
  const percentage = Math.min(100, Math.round((activePool.filledSlots / activePool.totalSlots) * 100));

  const handleIncrement = () => {
    if (selectedQty < maxAllowed) {
      setSelectedQty(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (selectedQty > 1) {
      setSelectedQty(prev => prev - 1);
    }
  };

  const handleConfirmJoin = async () => {
    setIsSubmitting(true);
    buttonScale.value = withSequence(
      withSpring(0.96, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
    try {
      const updated = await joinGroupPool(activePool.id, selectedQty);
      setPools(prev => prev.map(p => (p.id === activePool.id ? updated : p)));
    } catch (err: any) {
      Alert.alert('Unable to Join', err.message || 'Could not join pool.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmLeave = () => {
    Alert.alert('Leave Group Pool', `Remove your order from this community pool?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave Pool',
        style: 'destructive',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            const updated = await leaveGroupPool(activePool.id);
            setPools(prev => prev.map(p => (p.id === activePool.id ? updated : p)));
            setSelectedQty(1);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not leave pool.');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Top Drag Pill */}
          <View style={styles.dragPill} />

          {/* Minimal Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text style={styles.headerTitle}>Group Buying</Text>
              <Text style={styles.headerSub}>Pool crates with neighbours to save wholesale</Text>
            </View>

            <Pressable hitSlop={10} style={styles.closeBtn} onPress={onClose}>
              <Icon color="#64748B" name="close" size={18} />
            </Pressable>
          </View>

          {/* Minimal Horizontal Pill Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContainer}>
            {pools.map((pool, idx) => {
              const selected = selectedPoolIndex === idx;
              const userJoined = pool.userJoinedQuantity > 0;
              return (
                <Pressable
                  key={pool.id}
                  style={[
                    styles.tabPill,
                    selected && styles.tabPillSelected,
                  ]}
                  onPress={() => setSelectedPoolIndex(idx)}>
                  <Text style={styles.tabEmoji}>{pool.emoji}</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tabText,
                      selected && styles.tabTextSelected,
                    ]}>
                    {pool.title.split(' ')[0]} ({pool.unit})
                  </Text>
                  {userJoined ? (
                    <View style={styles.joinedDot} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Clean Main Stage Card */}
          <View style={styles.mainCard}>
            {/* Top Details */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View style={styles.emojiStage}>
                  <Text style={{ fontSize: 28 }}>{activePool.emoji}</Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text numberOfLines={1} style={styles.itemTitle}>{activePool.title}</Text>
                  <Text numberOfLines={1} style={styles.itemSub}>{activePool.subtitle}</Text>
                </View>
              </View>
            </View>

            {/* Price & Savings Line */}
            <View style={styles.priceRow}>
              <View className="flex-row items-baseline gap-2">
                <Text style={styles.priceMain}>₹{activePool.groupPrice}</Text>
                <Text style={styles.priceStrike}>₹{activePool.originalPrice}</Text>
                <Text style={styles.priceUnit}>/ {activePool.unit}</Text>
              </View>

              <View style={styles.discountPill}>
                <Text style={styles.discountText}>SAVE {discountPercent}%</Text>
              </View>
            </View>

            {/* Clean Thin Slot Progress Bar */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    isPoolFull ? styles.progressBarFull : styles.progressBarActive,
                    animatedFillStyle,
                  ]}
                />
              </View>

              <View className="flex-row items-center justify-between mt-1.5">
                <Text style={styles.slotText}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{activePool.filledSlots}</Text> of {activePool.totalSlots} slots
                </Text>

                {isPoolFull ? (
                  <Text style={styles.unlockedText}>✓ Goal unlocked</Text>
                ) : (
                  <Text style={styles.remainingText}>{remainingSlots} slots left</Text>
                )}
              </View>
            </View>

            {/* Neighbor Mini summary */}
            {activePool.members.length > 0 ? (
              <View style={styles.neighborsLine}>
                <Icon color="#94A3B8" name="people-outline" size={13} />
                <Text numberOfLines={1} style={styles.neighborsText}>
                  {activePool.members
                    .slice(0, 2)
                    .map(m => `${m.userName.split(' ')[0]} (+${m.quantity})`)
                    .join(', ')}
                  {activePool.members.length > 2 ? ` +${activePool.members.length - 2} more` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* User Status Bar if joined */}
          {hasJoined ? (
            <View style={styles.joinedBanner}>
              <View className="flex-row items-center gap-1.5 flex-1">
                <Icon color="#059669" name="checkmark-circle" size={15} />
                <Text style={styles.joinedBannerText}>
                  You joined for <Text style={{ fontWeight: '700' }}>{activePool.userJoinedQuantity} {activePool.unit}</Text> (₹{activePool.groupPrice * activePool.userJoinedQuantity})
                </Text>
              </View>

              <Pressable hitSlop={8} onPress={handleConfirmLeave}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Minimalist Bottom Action Bar */}
          <View style={styles.bottomBar}>
            {!isPoolFull ? (
              <View className="flex-row items-center gap-2.5">
                {/* Clean Stepper */}
                <View style={styles.stepper}>
                  <Pressable
                    disabled={selectedQty <= 1 || isSubmitting}
                    style={[styles.stepBtn, selectedQty <= 1 && styles.stepBtnDisabled]}
                    onPress={handleDecrement}>
                    <Icon color={selectedQty <= 1 ? '#CBD5E1' : '#0F172A'} name="remove" size={16} />
                  </Pressable>

                  <Text style={styles.qtyText}>{selectedQty}</Text>

                  <Pressable
                    disabled={selectedQty >= maxAllowed || isSubmitting}
                    style={[styles.stepBtn, selectedQty >= maxAllowed && styles.stepBtnDisabled]}
                    onPress={handleIncrement}>
                    <Icon color={selectedQty >= maxAllowed ? '#CBD5E1' : '#0F172A'} name="add" size={16} />
                  </Pressable>
                </View>

                {/* Primary CTA */}
                <Animated.View style={[{ flex: 1 }, animatedButtonStyle]}>
                  <Pressable
                    disabled={isSubmitting || maxAllowed === 0}
                    style={[
                      styles.ctaBtn,
                      hasJoined && styles.ctaBtnJoined,
                      (isSubmitting || maxAllowed === 0) && { opacity: 0.6 },
                    ]}
                    onPress={handleConfirmJoin}>
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.ctaBtnText}>
                        {hasJoined
                          ? `Update (${selectedQty}) • ₹${totalLinePrice}`
                          : `Join Pool • ₹${totalLinePrice}`}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.fullLockedBanner}>
                <Icon color="#059669" name="checkmark-done" size={16} />
                <Text style={styles.fullLockedText}>Pool full (20/20 slots) • Dispatched tomorrow</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
    zIndex: 10,
  },
  dragPill: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    height: 4,
    marginBottom: 12,
    width: 36,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  tabsScroll: {
    marginVertical: 10,
  },
  tabsContainer: {
    gap: 8,
  },
  tabPill: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tabPillSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabEmoji: {
    fontSize: 14,
  },
  tabText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  joinedDot: {
    backgroundColor: '#10B981',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
    padding: 14,
  },
  emojiStage: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  itemTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  priceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  priceMain: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
  },
  priceStrike: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  priceUnit: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  discountPill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  discountText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '800',
  },
  progressWrap: {
    marginTop: 10,
  },
  progressTrack: {
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    height: 5,
    overflow: 'hidden',
  },
  progressBar: {
    borderRadius: 3,
    height: '100%',
  },
  progressBarActive: {
    backgroundColor: '#EA580C',
  },
  progressBarFull: {
    backgroundColor: '#10B981',
  },
  slotText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  remainingText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '700',
  },
  unlockedText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  neighborsLine: {
    alignItems: 'center',
    borderTopColor: '#F8FAFC',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
  },
  neighborsText: {
    color: '#64748B',
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  joinedBanner: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  joinedBannerText: {
    color: '#065F46',
    fontSize: 11.5,
    fontWeight: '500',
  },
  cancelLink: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  bottomBar: {
    marginTop: 14,
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  stepBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stepBtnDisabled: {
    backgroundColor: '#F8FAFC',
  },
  qtyText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  ctaBtn: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  ctaBtnJoined: {
    backgroundColor: '#059669',
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fullLockedBanner: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  fullLockedText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
