import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  getAvailablePaymentMethods,
  getDefaultPaymentMethodId,
  getPaymentMethodLabel,
  processPayment,
} from '../services/paymentService';
import { createOrder } from '../services/orderService';
import { clearCart } from '../services/cartService';
import { getCurrentUser } from '../services/userService';
import { PaymentMethodId } from '../types/payment';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { CONTENT_MAX, useCenteredContentStyle, useResponsiveLayout } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

export function PaymentScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet, horizontalPadding, width } = useResponsiveLayout();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingTop: 8,
    paddingBottom: 140,
  });
  const { checkout } = route.params;
  const methods = useMemo(() => getAvailablePaymentMethods(), []);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>(getDefaultPaymentMethodId());
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const featuredMethod = methods.find(method => method.recommended);
  const otherMethods = methods.filter(method => !method.recommended);
  const itemCount = checkout.items.reduce((sum, item) => sum + item.quantity, 0);

  const handlePay = async () => {
    setErrorMessage('');
    setIsPaying(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        navigation.replace('Login');
        return;
      }

      const payment = await processPayment(selectedMethod, checkout.total, user);
      if (!payment.success) {
        setErrorMessage(payment.message ?? 'Payment failed or cancelled. Please try again.');
        return;
      }

      const order = await createOrder(user, {
        items: checkout.items,
        deliverySlot: checkout.deliverySlot,
        deliveryTime: checkout.deliveryTime,
        instructions: checkout.instructions,
      });

      try {
        await clearCart();
      } catch {
        // Order already placed — don't block success if cart clear fails
      }

      navigation.replace('OrderSuccess', {
        orderId: order.orderId,
        total: checkout.total,
        paymentMethod: selectedMethod,
        transactionId: payment.transactionId,
        deliverySlot: checkout.deliverySlot,
        deliveryTime: checkout.deliveryTime,
        blockNumber: user.blockNumber,
        flatNo: user.flatNo,
        orderedAt: order.orderedAt,
        status: order.status,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not complete payment. Please try again.'));
    } finally {
      setIsPaying(false);
    }
  };

  const payLabel =
    selectedMethod === 'cod'
      ? `Place COD Order · ₹${checkout.total.toFixed(0)}`
      : `Pay ₹${checkout.total.toFixed(0)} via Razorpay`;

  return (
    <View className="flex-1" style={styles.screen}>
      <View style={[styles.headerOuter, { paddingTop: insets.top + 12 }]}>
        <View
          style={[
            styles.headerInner,
            isTablet && {
              maxWidth: CONTENT_MAX.form,
              paddingHorizontal: horizontalPadding,
            },
          ]}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon color={colors.textPrimary} name="chevron-back" size={22} />
          </Pressable>
          <View className="flex-1 ml-3">
            <Text className="text-base font-bold text-slate-900">Payment</Text>
            <Text className="text-sm text-slate-500">Secure checkout · G-Fresh Mart</Text>
          </View>
          <View style={styles.securePill}>
            <Icon color={colors.primary} name="shield-checkmark" size={14} />
            <Text className="ml-1 text-xs font-semibold text-primary">100% Secure</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text className="text-sm font-bold text-slate-900">Order summary</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-sm text-slate-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
            <Text className="text-base font-bold text-slate-900">₹{checkout.total.toFixed(0)}</Text>
          </View>
          <View className="mt-2 flex-row items-center">
            <Icon color={colors.primary} name="bicycle-outline" size={16} />
            <Text className="ml-2 flex-1 text-sm text-slate-600">
              {checkout.deliverySlot} · {checkout.deliveryTime}
            </Text>
          </View>
        </View>

        {/* Featured Razorpay Instant Pay Card */}
        {featuredMethod ? (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Recommended Payment</Text>
            <Pressable
              accessibilityRole="button"
              style={[
                styles.featuredCard,
                selectedMethod === featuredMethod.id && styles.featuredCardActive,
              ]}
              onPress={() => setSelectedMethod(featuredMethod.id)}>
              <View style={styles.featuredTop}>
                <View style={styles.featuredIconWrap}>
                  <Icon color={colors.primary} name={featuredMethod.icon} size={22} />
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text style={styles.featuredTitle}>{featuredMethod.title}</Text>
                    {featuredMethod.badge ? (
                      <View style={styles.badgeWrap}>
                        <Text style={styles.badgeText}>{featuredMethod.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.featuredSubtitle}>{featuredMethod.subtitle}</Text>
                </View>
                <Icon
                  color={selectedMethod === featuredMethod.id ? colors.primary : '#CBD5E1'}
                  name={selectedMethod === featuredMethod.id ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                />
              </View>

              {/* Supported payment icons pill bar */}
              <View style={styles.supportedRail}>
                <View style={styles.supportedTag}>
                  <Text style={styles.supportedTagText}>⚡ GPay</Text>
                </View>
                <View style={styles.supportedTag}>
                  <Text style={styles.supportedTagText}>PhonePe</Text>
                </View>
                <View style={styles.supportedTag}>
                  <Text style={styles.supportedTagText}>Paytm</Text>
                </View>
                <View style={styles.supportedTag}>
                  <Text style={styles.supportedTagText}>Cards</Text>
                </View>
                <View style={styles.supportedTag}>
                  <Text style={styles.supportedTagText}>NetBanking</Text>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Other Payment Options (COD, etc.) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Other Options</Text>
          <View style={styles.methodsCard}>
            {otherMethods.map((method, index) => {
              const active = selectedMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  accessibilityRole="button"
                  style={[styles.methodRow, index > 0 && styles.methodDivider]}
                  onPress={() => setSelectedMethod(method.id)}>
                  <View style={[styles.methodIcon, active && styles.methodIconActive]}>
                    <Icon
                      color={active ? colors.primaryDark : colors.primary}
                      name={method.icon}
                      size={19}
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-slate-900">{method.title}</Text>
                    <Text className="mt-0.5 text-xs text-slate-500">{method.subtitle}</Text>
                  </View>
                  <Icon
                    color={active ? colors.primary : '#CBD5E1'}
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.trustRow}>
          <Icon color={colors.primary} name="shield-checkmark-outline" size={15} />
          <Text className="ml-2 flex-1 text-xs text-slate-500">
            256-bit SSL encrypted. Selected: {getPaymentMethodLabel(selectedMethod)}
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Icon color={colors.danger} name="alert-circle" size={16} />
            <Text className="ml-2 flex-1 text-sm text-red-600">{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        <View
          style={
            isTablet
              ? [
                  styles.tabletBottomInner,
                  {
                    maxWidth: CONTENT_MAX.form,
                    paddingHorizontal: horizontalPadding,
                    width: Math.min(width, CONTENT_MAX.form),
                  },
                ]
              : undefined
          }>
          <View className="mb-3 flex-row items-end justify-between">
            <Text className="text-sm text-slate-500">Total payable</Text>
            <Text className="text-xl font-extrabold text-slate-900">
              ₹{checkout.total.toFixed(0)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isPaying}
            style={[styles.payButton, isPaying && styles.payButtonDisabled]}
            onPress={handlePay}>
            {isPaying ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon
                  color={colors.white}
                  name={selectedMethod === 'cod' ? 'bicycle' : 'flash'}
                  size={18}
                />
                <Text className="ml-2 text-[15px] font-bold text-white">{payLabel}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  headerOuter: {
    backgroundColor: colors.white,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  headerInner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  securePill: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  sectionWrap: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  featuredCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    padding: 16,
    shadowColor: '#0A5C3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  featuredCardActive: {
    backgroundColor: '#F7FCF9',
    borderColor: colors.primary,
  },
  featuredTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  featuredIconWrap: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  featuredTitle: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '800',
  },
  featuredSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  badgeWrap: {
    backgroundColor: '#FEF08A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#854D0E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  supportedRail: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
  },
  supportedTag: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  supportedTagText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '600',
  },
  methodsCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  methodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  methodDivider: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
  },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  methodIconActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  trustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bottomBar: {
    backgroundColor: colors.white,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 10,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  tabletBottomInner: {
    alignSelf: 'center',
  },
});
