import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calculateOrderTotal } from '../../services/orderService';
import { GfmOrder } from '../../types/gfm';
import { colors } from '../../theme/colors';
import {
  buildCalendarGrid,
  buildOrderActivityMap,
  formatDisplayDate,
  getLongestStreakInMonth,
  getMonthActivity,
  getMonthLabel,
  isDateInRange,
  toDateKey,
} from '../../utils/orderCalendar';
import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  visible: boolean;
  orders: GfmOrder[];
  onClose: () => void;
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function AdminActivityCalendar({ visible, orders, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet, pageMaxWidth, horizontalPadding } = useResponsiveLayout();
  const now = new Date();
  const todayKey = toDateKey(now);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  useEffect(() => {
    if (visible) {
      const today = new Date();
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      setSelectedDateKey(toDateKey(today));
    }
  }, [visible]);

  const activityMap = useMemo(() => buildOrderActivityMap(orders), [orders]);
  const selectedActivity = selectedDateKey ? activityMap.get(selectedDateKey) : undefined;
  const selectedOrders = useMemo(
    () =>
      selectedDateKey
        ? orders.filter(order => toDateKey(order.orderedAt) === selectedDateKey)
        : [],
    [orders, selectedDateKey],
  );
  const selectedDate = useMemo(
    () => (selectedDateKey ? new Date(`${selectedDateKey}T12:00:00`) : null),
    [selectedDateKey],
  );
  const monthActivity = useMemo(
    () => getMonthActivity(activityMap, viewYear, viewMonth),
    [activityMap, viewMonth, viewYear],
  );
  const monthStreak = useMemo(
    () => getLongestStreakInMonth(activityMap, viewYear, viewMonth),
    [activityMap, viewMonth, viewYear],
  );
  const { cells, weekdays } = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewMonth, viewYear],
  );

  const highlightRange = monthStreak;
  const headlineValue = selectedActivity?.orderCount ?? 0;

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 12,
              maxHeight: isTablet ? '72%' : '68%',
              alignSelf: 'center',
              maxWidth: isTablet ? pageMaxWidth : undefined,
              paddingHorizontal: isTablet ? horizontalPadding : 16,
              width: '100%',
            },
          ]}>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
            <View style={styles.grabber} />
          </Pressable>

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Order calendar</Text>
            <Pressable
              accessibilityLabel="Close calendar"
              accessibilityRole="button"
              hitSlop={10}
              style={styles.closeButton}
              onPress={onClose}>
              <Icon color={colors.textSecondary} name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryNumber}>{headlineValue}</Text>
                <Text style={styles.summaryLabel}>Orders</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryHint} numberOfLines={2}>
                  {selectedDate ? formatDisplayDate(selectedDate) : 'Select a date'}
                </Text>
                <Text style={styles.summaryMeta}>
                  {selectedActivity
                    ? `Revenue ${formatMoney(selectedActivity.revenue)}`
                    : 'No orders on this date'}
                </Text>
              </View>
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Pressable hitSlop={10} style={styles.navButton} onPress={() => shiftMonth(-1)}>
                  <Icon color="#E67E22" name="chevron-back" size={20} />
                </Pressable>
                <Text style={styles.monthLabel}>{getMonthLabel(viewYear, viewMonth)}</Text>
                <Pressable hitSlop={10} style={styles.navButton} onPress={() => shiftMonth(1)}>
                  <Icon color="#E67E22" name="chevron-forward" size={20} />
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {weekdays.map(day => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.grid}>
                {cells.map(cell => {
                  if (cell.day === null) {
                    return <View key={cell.key} style={styles.dayCell} />;
                  }

                  const isActive = monthActivity.activeDates.has(cell.key);
                  const inStreak =
                    highlightRange &&
                    isDateInRange(cell.key, highlightRange.startDate, highlightRange.endDate);
                  const isSelected = selectedDateKey === cell.key;
                  const isToday = todayKey === cell.key;

                  return (
                    <Pressable
                      key={cell.key}
                      style={styles.dayCell}
                      onPress={() => setSelectedDateKey(cell.key)}>
                      <View
                        style={[
                          styles.dayBubble,
                          isActive && !isSelected && styles.dayBubbleActive,
                          inStreak && !isSelected && styles.dayBubbleStreak,
                          isToday && !isSelected && styles.dayBubbleToday,
                          isSelected && styles.dayBubbleSelected,
                        ]}>
                        <Text
                          style={[
                            styles.dayText,
                            (isActive || inStreak) && !isSelected && styles.dayTextActive,
                            isSelected && styles.dayTextSelected,
                          ]}>
                          {cell.day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {selectedOrders.length > 0 ? (
              <View style={styles.ordersCard}>
                {selectedOrders.slice(0, 2).map((order, index) => {
                  const total = calculateOrderTotal(order.items);
                  return (
                    <View key={order.id}>
                      {index > 0 ? <View style={styles.resultsDivider} /> : null}
                      <View style={styles.orderRow}>
                        <Text style={styles.orderId} numberOfLines={1}>
                          {order.orderId}
                        </Text>
                        <Text style={styles.orderAmount}>{formatMoney(total)}</Text>
                      </View>
                    </View>
                  );
                })}
                {selectedOrders.length > 2 ? (
                  <Text style={styles.moreOrders}>+{selectedOrders.length - 2} more orders</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.footerStats}>
              <FooterStat
                label="Month orders"
                value={String(monthActivity.totalOrders)}
              />
              <View style={styles.footerDivider} />
              <FooterStat
                label="Month revenue"
                value={formatMoney(monthActivity.totalRevenue)}
              />
              <View style={styles.footerDivider} />
              <FooterStat
                label="Streak"
                value={
                  highlightRange
                    ? `${highlightRange.dayCount}d`
                    : '—'
                }
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.footerStat}>
      <Text style={styles.footerValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.footerLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 4,
    marginBottom: 10,
    width: 40,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryLeft: {
    alignItems: 'center',
    borderRightColor: '#F1F5F9',
    borderRightWidth: 1,
    minWidth: 72,
    paddingRight: 14,
  },
  summaryNumber: {
    color: '#E67E22',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 36,
  },
  summaryLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryRight: {
    flex: 1,
    paddingLeft: 14,
  },
  summaryHint: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  calendarCard: {
    backgroundColor: colors.white,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  monthLabel: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayBubble: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  dayBubbleActive: {
    backgroundColor: colors.primaryLight,
  },
  dayBubbleStreak: {
    backgroundColor: colors.primary,
  },
  dayBubbleToday: {
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  dayBubbleSelected: {
    backgroundColor: colors.primary,
    borderColor: '#E67E22',
    borderWidth: 2,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextActive: {
    color: colors.white,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '800',
  },
  ordersCard: {
    backgroundColor: colors.white,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  orderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  orderId: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  orderAmount: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  moreOrders: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    paddingBottom: 6,
    paddingTop: 2,
  },
  resultsDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
  },
  footerStats: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  footerStat: {
    alignItems: 'center',
    flex: 1,
  },
  footerValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  footerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  footerDivider: {
    backgroundColor: '#E5E7EB',
    height: 28,
    width: 1,
  },
});
