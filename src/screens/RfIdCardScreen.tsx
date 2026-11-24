import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { getRfIdCard, rechargeRfIdCard } from '../services/rfidService';
import { getCurrentUser } from '../services/userService';
import { RfIdCard } from '../types/rfid';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'RfIdCard'>;

const QUICK_AMOUNTS = [100, 200, 500, 1000];

export function RfIdCardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingTop: 16,
    paddingBottom: insets.bottom + 28,
  });
  const [card, setCard] = useState<RfIdCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(200);
  const [customAmount, setCustomAmount] = useState('');

  const loadCard = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      navigation.replace('Login');
      return;
    }

    const data = await getRfIdCard(user);
    setCard(data);
    setLoading(false);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCard();
    }, [loadCard]),
  );

  const rechargeValue = useMemo(() => {
    const custom = Number(customAmount);
    if (customAmount.trim() && !Number.isNaN(custom) && custom > 0) {
      return custom;
    }
    return selectedAmount;
  }, [customAmount, selectedAmount]);

  const handleRecharge = async () => {
    const user = await getCurrentUser();
    if (!user) {
      navigation.replace('Login');
      return;
    }

    setRecharging(true);
    try {
      const updated = await rechargeRfIdCard(user, rechargeValue);
      setCard(updated);
      setCustomAmount('');
      Alert.alert('Recharge successful', `₹${rechargeValue} added to your RF ID card.`);
    } catch (error) {
      Alert.alert('Recharge failed', getErrorMessage(error, 'Could not recharge. Try again.'));
    } finally {
      setRecharging(false);
    }
  };

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Community mart wallet"
        title="RF ID Card"
        onBack={() => navigation.goBack()}
      />

      {loading || !card ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}>
          <View style={styles.cardVisual}>
            <View pointerEvents="none" style={styles.cardGlowOne} />
            <View pointerEvents="none" style={styles.cardGlowTwo} />

            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-xs font-semibold text-white/70">G-Fresh Community</Text>
                <Text className="mt-1 text-base font-bold text-white">RF ID CARD</Text>
              </View>
              <View style={styles.chip}>
                <View style={styles.chipInner} />
              </View>
            </View>

            <View className="mt-8">
              <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-accent">
                Available balance
              </Text>
              <Text className="mt-1 text-3xl font-bold text-white">₹{card.balance.toFixed(0)}</Text>
            </View>

            <View className="mt-6 flex-row items-end justify-between">
              <View>
                <Text className="text-[11px] text-white/55">Card holder</Text>
                <Text className="mt-1 text-sm font-semibold text-white">{card.holderName}</Text>
                <Text className="mt-3 text-[11px] text-white/55">Card number</Text>
                <Text className="mt-1 text-sm font-semibold text-white">{card.cardNumber}</Text>
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text className="ml-1.5 text-[11px] font-bold text-primary-dark">
                  {card.status === 'active' ? 'Active' : 'Blocked'}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 12 }}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
                <Icon color={colors.danger} name="arrow-up-outline" size={16} />
              </View>
              <Text className="mt-3 text-xs text-slate-500">Total spent</Text>
              <Text className="mt-1 text-base font-bold text-slate-900">₹{card.totalSpent.toFixed(0)}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#ECFDF3' }]}>
                <Icon color={colors.primary} name="arrow-down-outline" size={16} />
              </View>
              <Text className="mt-3 text-xs text-slate-500">Total recharged</Text>
              <Text className="mt-1 text-base font-bold text-slate-900">
                ₹{card.totalRecharged.toFixed(0)}
              </Text>
            </View>
          </View>

          <View style={styles.linkedCard}>
            <Icon color={colors.primary} name="home-outline" size={18} />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-slate-900">Linked flat</Text>
              <Text className="mt-0.5 text-sm text-slate-500">{card.linkedFlat}</Text>
            </View>
            <Icon color={colors.primary} name="radio-outline" size={18} />
          </View>

          <Text className="mt-5 mb-3 text-sm font-bold text-slate-900">Quick recharge</Text>
          <View style={styles.rechargeCard}>
            <View style={styles.amountRow}>
              {QUICK_AMOUNTS.map(amount => {
                const active = !customAmount && selectedAmount === amount;
                return (
                  <Pressable
                    key={amount}
                    style={[styles.amountChip, active && styles.amountChipActive]}
                    onPress={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}>
                    <Text style={[styles.amountText, active && styles.amountTextActive]}>₹{amount}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-4 mb-2 text-xs font-semibold text-slate-500">Custom amount</Text>
            <View style={styles.customInputWrap}>
              <Text className="mr-2 text-base font-bold text-slate-700">₹</Text>
              <TextInput
                keyboardType="number-pad"
                placeholder="Enter amount"
                placeholderTextColor="#94A3B8"
                style={styles.customInput}
                value={customAmount}
                onChangeText={setCustomAmount}
              />
            </View>

            <Pressable
              disabled={recharging || rechargeValue <= 0}
              style={[styles.rechargeButton, (recharging || rechargeValue <= 0) && styles.rechargeDisabled]}
              onPress={handleRecharge}>
              {recharging ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Icon color={colors.white} name="flash" size={16} />
                  <Text className="ml-2 text-sm font-bold text-white">
                    Recharge ₹{rechargeValue.toFixed(0)}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Text className="mt-5 mb-3 text-sm font-bold text-slate-900">Recent activity</Text>
          <View style={styles.activityCard}>
            {card.transactions.map((tx, index) => (
              <View
                key={tx.id}
                style={[styles.activityRow, index > 0 && styles.activityDivider]}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: tx.type === 'recharge' ? '#ECFDF3' : '#FEF2F2' },
                  ]}>
                  <Icon
                    color={tx.type === 'recharge' ? colors.primary : colors.danger}
                    name={tx.type === 'recharge' ? 'add-circle-outline' : 'remove-circle-outline'}
                    size={18}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-slate-900">{tx.title}</Text>
                  <Text className="mt-0.5 text-xs text-slate-500">{tx.subtitle}</Text>
                </View>
                <Text
                  className={`text-sm font-bold ${tx.type === 'recharge' ? 'text-primary' : 'text-red-500'}`}>
                  {tx.type === 'recharge' ? '+' : '-'}₹{tx.amount.toFixed(0)}
                </Text>
              </View>
            ))}
          </View>
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
  cardVisual: {
    backgroundColor: colors.primaryDark,
    borderRadius: 28,
    overflow: 'hidden',
    padding: 20,
  },
  cardGlowOne: {
    backgroundColor: 'rgba(184, 240, 74, 0.18)',
    borderRadius: 999,
    height: 160,
    position: 'absolute',
    right: -40,
    top: -50,
    width: 160,
  },
  cardGlowTwo: {
    backgroundColor: 'rgba(26, 143, 92, 0.35)',
    borderRadius: 999,
    bottom: -30,
    height: 120,
    left: -30,
    position: 'absolute',
    width: 120,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: 44,
  },
  chipInner: {
    backgroundColor: 'rgba(184, 240, 74, 0.85)',
    borderRadius: 5,
    height: 22,
    width: '100%',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  statCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  linkedCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rechargeCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: '22%',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  amountChipActive: {
    backgroundColor: '#ECFDF3',
    borderColor: colors.primary,
  },
  amountText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountTextActive: {
    color: colors.primaryDark,
  },
  customInputWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  rechargeButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 15,
  },
  rechargeDisabled: {
    opacity: 0.6,
  },
  activityCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  activityDivider: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
  },
  activityIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
