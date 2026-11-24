import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  fetchDeliveryScheduleForUser,
  formatWeekdayLabel,
  upsertDeliverySchedule,
} from '../services/deliveryScheduleService';
import { getCurrentUser } from '../services/userService';
import {
  DeliveryScheduleStatus,
  DeliverySlotPreference,
  DeliveryType,
  Weekday,
} from '../types/gfm';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliverySchedule'>;

const DELIVERY_TYPES: {
  id: DeliveryType;
  title: string;
  example: string;
  icon: string;
  badge: string;
}[] = [
  {
    id: 'ON_DEMAND',
    title: 'On demand',
    example: 'Order whenever you need — no fixed day',
    icon: 'flash',
    badge: 'Flexible',
  },
  {
    id: 'WEEKLY',
    title: 'Weekly grocery',
    example: 'Same day every week (ex: every Saturday)',
    icon: 'calendar',
    badge: 'Best for families',
  },
  {
    id: 'MONTHLY',
    title: 'Monthly grocery',
    example: 'One big delivery each month (ex: 1st / 15th)',
    icon: 'calendar-number',
    badge: 'Bulk stock',
  },
];

const WEEKDAYS: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const MONTH_DAYS = [1, 5, 10, 15, 20, 25, 28];

const SLOTS: {
  id: DeliverySlotPreference;
  title: string;
  time: string;
  icon: string;
}[] = [
  { id: 'MORNING', title: 'Morning', time: '8:00 – 11:00 AM', icon: 'sunny-outline' },
  { id: 'EVENING', title: 'Evening', time: '5:00 – 8:00 PM', icon: 'moon-outline' },
];

function StepHeader({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <View style={styles.stepTextWrap}>
        <Text style={styles.stepTitle}>{title}</Text>
        {hint ? <Text style={styles.stepHint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

export function DeliveryScheduleScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingBottom: insets.bottom + 100,
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('ON_DEMAND');
  const [weekday, setWeekday] = useState<Weekday>('SATURDAY');
  const [monthDay, setMonthDay] = useState(1);
  const [slot, setSlot] = useState<DeliverySlotPreference>('MORNING');
  const [status, setStatus] = useState<DeliveryScheduleStatus>('ACTIVE');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const user = await getCurrentUser();
          if (!user) {
            navigation.replace('Login');
            return;
          }
          setUserId(user.id);
          setHouseholdId(user.householdId ?? null);

          const schedule = await fetchDeliveryScheduleForUser(user.id);
          if (schedule) {
            setDeliveryType(schedule.deliveryType);
            if (schedule.preferredWeekday) setWeekday(schedule.preferredWeekday);
            if (schedule.preferredMonthDay) setMonthDay(schedule.preferredMonthDay);
            setSlot(schedule.preferredSlot);
            setStatus(schedule.status);
            setNotes(schedule.notes ?? '');
          }
        } catch (error) {
          Alert.alert(
            'Could not load',
            getErrorMessage(
              error,
              'Run supabase/gfm_delivery_schedules.sql in Supabase, wait ~10s, then retry.',
            ),
          );
        } finally {
          setLoading(false);
        }
      })();
    }, [navigation]),
  );

  const planLines = useMemo(() => {
    const slotLabel = slot === 'MORNING' ? 'Morning 8–11 AM' : 'Evening 5–8 PM';
    if (deliveryType === 'ON_DEMAND') {
      return {
        headline: 'On-demand delivery',
        detail: 'No fixed schedule. Order anytime from the app.',
        active: true,
      };
    }
    if (deliveryType === 'WEEKLY') {
      return {
        headline: `Every ${formatWeekdayLabel(weekday)}`,
        detail: `${slotLabel}${status === 'PAUSED' ? ' · Schedule paused' : ' · Active'}`,
        active: status === 'ACTIVE',
      };
    }
    return {
      headline: `Monthly · Day ${monthDay}`,
      detail: `${slotLabel}${status === 'PAUSED' ? ' · Schedule paused' : ' · Active'}`,
      active: status === 'ACTIVE',
    };
  }, [deliveryType, weekday, monthDay, slot, status]);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      await upsertDeliverySchedule({
        userId,
        householdId,
        deliveryType,
        preferredWeekday: deliveryType === 'WEEKLY' ? weekday : null,
        preferredMonthDay: deliveryType === 'MONTHLY' ? monthDay : null,
        preferredSlot: slot,
        notes,
        status: deliveryType === 'ON_DEMAND' ? 'ACTIVE' : status,
      });
      Alert.alert('Saved', 'Your delivery plan is updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Save failed', getErrorMessage(error, 'Could not save schedule.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Pick how groceries should arrive"
        title="Delivery plan"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your plan…</Text>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={[{ paddingTop: 16 }, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Live preview */}
            <View style={styles.previewCard}>
              <View style={styles.previewTop}>
                <View style={styles.previewIcon}>
                  <Icon color={colors.primaryDark} name="bicycle" size={22} />
                </View>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewEyebrow}>Your current plan</Text>
                  <Text style={styles.previewHeadline}>{planLines.headline}</Text>
                  <Text style={styles.previewDetail}>{planLines.detail}</Text>
                </View>
                <View
                  style={[
                    styles.livePill,
                    planLines.active ? styles.livePillOn : styles.livePillOff,
                  ]}>
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: planLines.active ? '#22C55E' : '#F59E0B' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.livePillText,
                      { color: planLines.active ? '#166534' : '#92400E' },
                    ]}>
                    {planLines.active ? 'ON' : 'PAUSED'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Step 1 */}
            <View style={styles.sectionCard}>
              <StepHeader
                step={1}
                title="Choose delivery type"
                hint="Tap one option below"
              />
              {DELIVERY_TYPES.map(item => {
                const selected = deliveryType === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.typeRow, selected && styles.typeRowSelected]}
                    onPress={() => setDeliveryType(item.id)}>
                    <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
                      <Icon
                        color={selected ? colors.white : colors.primary}
                        name={item.icon}
                        size={18}
                      />
                    </View>
                    <View style={styles.typeCopy}>
                      <View style={styles.typeTitleRow}>
                        <Text style={[styles.typeTitle, selected && styles.typeTitleSelected]}>
                          {item.title}
                        </Text>
                        <View style={[styles.badge, selected && styles.badgeSelected]}>
                          <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
                            {item.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.typeExample}>{item.example}</Text>
                    </View>
                    <Icon
                      color={selected ? colors.primary : '#CBD5E1'}
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Step 2 — only for scheduled */}
            {deliveryType !== 'ON_DEMAND' ? (
              <View style={styles.sectionCard}>
                <StepHeader
                  step={2}
                  title={deliveryType === 'WEEKLY' ? 'Pick your weekday' : 'Pick day of month'}
                  hint={
                    deliveryType === 'WEEKLY'
                      ? 'Groceries arrive every week on this day'
                      : 'Groceries arrive once a month on this date'
                  }
                />

                {deliveryType === 'WEEKLY' ? (
                  <View style={styles.dayGrid}>
                    {WEEKDAYS.map(day => {
                      const selected = weekday === day;
                      return (
                        <Pressable
                          key={day}
                          style={[styles.dayCell, selected && styles.dayCellSelected]}
                          onPress={() => setWeekday(day)}>
                          <Text style={[styles.dayCellText, selected && styles.dayCellTextSelected]}>
                            {formatWeekdayLabel(day).slice(0, 3)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <>
                    <View style={styles.dayGrid}>
                      {MONTH_DAYS.map(day => {
                        const selected = monthDay === day;
                        return (
                          <Pressable
                            key={day}
                            style={[styles.monthCell, selected && styles.dayCellSelected]}
                            onPress={() => setMonthDay(day)}>
                            <Text style={[styles.monthNum, selected && styles.dayCellTextSelected]}>
                              {day}
                            </Text>
                            <Text
                              style={[styles.monthLabel, selected && styles.dayCellTextSelected]}>
                              {day === 1 ? 'st' : day === 5 ? 'th' : 'th'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={styles.helperNote}>Days 1–28 only (works every month).</Text>
                  </>
                )}
              </View>
            ) : null}

            {/* Step 3 — slot + pause */}
            {deliveryType !== 'ON_DEMAND' ? (
              <View style={styles.sectionCard}>
                <StepHeader
                  step={3}
                  title="Preferred time slot"
                  hint="When should the delivery arrive?"
                />
                <View style={styles.slotRow}>
                  {SLOTS.map(item => {
                    const selected = slot === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.slotCard, selected && styles.slotCardSelected]}
                        onPress={() => setSlot(item.id)}>
                        <Icon
                          color={selected ? colors.primary : '#64748B'}
                          name={item.icon}
                          size={22}
                        />
                        <Text style={[styles.slotTitle, selected && styles.slotTitleSelected]}>
                          {item.title}
                        </Text>
                        <Text style={styles.slotTime}>{item.time}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.pauseRow}>
                  <View style={styles.pauseCopy}>
                    <Text style={styles.pauseTitle}>Keep schedule active</Text>
                    <Text style={styles.pauseHint}>
                      Turn off to pause weekly/monthly deliveries temporarily
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                    thumbColor={status === 'ACTIVE' ? colors.primary : '#F8FAFC'}
                    value={status === 'ACTIVE'}
                    onValueChange={on => setStatus(on ? 'ACTIVE' : 'PAUSED')}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.onDemandCard}>
                <Icon color={colors.primary} name="checkmark-circle" size={22} />
                <View style={styles.onDemandCopy}>
                  <Text style={styles.onDemandTitle}>No schedule needed</Text>
                  <Text style={styles.onDemandHint}>
                    You can place grocery orders anytime from Home or Categories.
                  </Text>
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={styles.sectionCard}>
              <StepHeader
                step={deliveryType === 'ON_DEMAND' ? 2 : 4}
                title="Delivery note"
                hint="Optional — gate code, call before, etc."
              />
              <TextInput
                multiline
                placeholder="Example: Leave at door · Call on arrival"
                placeholderTextColor="#94A3B8"
                style={styles.notes}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
            <View style={styles.footerSummary}>
              <Text style={styles.footerLabel} numberOfLines={1}>
                {planLines.headline}
              </Text>
              <Text style={styles.footerDetail} numberOfLines={1}>
                {planLines.detail}
              </Text>
            </View>
            <Pressable
              disabled={saving}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>Save plan</Text>
                  <Icon color={colors.white} name="arrow-forward" size={16} />
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  previewCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 22,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 16,
  },
  previewTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  previewIcon: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  previewCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  previewEyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  previewHeadline: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  previewDetail: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  livePill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  livePillOn: {
    backgroundColor: '#ECFDF3',
  },
  livePillOff: {
    backgroundColor: '#FEF3C7',
  },
  liveDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  stepHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 14,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  stepTextWrap: {
    flex: 1,
    marginLeft: 10,
    paddingTop: 2,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  stepHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  typeRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  typeRowSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  typeIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  typeIconSelected: {
    backgroundColor: colors.primary,
  },
  typeCopy: {
    flex: 1,
    marginHorizontal: 10,
  },
  typeTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  typeTitleSelected: {
    color: colors.primaryDark,
  },
  badge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeSelected: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextSelected: {
    color: colors.primaryDark,
  },
  typeExample: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingVertical: 12,
    width: '13%',
    minWidth: 42,
    flexGrow: 1,
  },
  monthCell: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 12,
    width: '22%',
    flexGrow: 1,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayCellText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  dayCellTextSelected: {
    color: colors.white,
  },
  monthNum: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  monthLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  helperNote: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slotCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    padding: 14,
  },
  slotCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  slotTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  slotTitleSelected: {
    color: colors.primaryDark,
  },
  slotTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  pauseRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pauseCopy: {
    flex: 1,
    marginRight: 10,
  },
  pauseTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  pauseHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  onDemandCard: {
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 16,
  },
  onDemandCopy: {
    flex: 1,
    marginLeft: 10,
  },
  onDemandTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  onDemandHint: {
    color: '#166534',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  notes: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 90,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  footer: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerSummary: {
    flex: 1,
  },
  footerLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  footerDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    minWidth: 120,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
