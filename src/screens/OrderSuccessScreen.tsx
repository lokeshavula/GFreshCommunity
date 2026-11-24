import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/AppNavigator';
import { getPaymentMethodLabel } from '../services/paymentService';
import { colors } from '../theme/colors';
import { CONTENT_MAX, useResponsiveLayout } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderSuccess'>;

export function OrderSuccessScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet, horizontalPadding } = useResponsiveLayout();
  const { orderId, total, paymentMethod, transactionId, deliverySlot, deliveryTime, blockNumber, flatNo, orderedAt, status } =
    route.params;

  return (
    <View className="flex-1" style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View
        className="flex-1 items-center justify-center"
        style={{
          alignSelf: 'center',
          maxWidth: isTablet ? CONTENT_MAX.form : undefined,
          paddingHorizontal: isTablet ? horizontalPadding : 24,
          width: '100%',
        }}>
        <View style={styles.successGlow} />
        <View style={styles.iconWrap}>
          <Icon color={colors.primaryDark} name="checkmark" size={42} />
        </View>
        <Text className="mt-6 text-center text-xl font-bold text-slate-900">Order confirmed</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
          Thanks for ordering from G-Fresh Mart. Track it from the community mart to your flat.
        </Text>

        <View style={styles.card}>
          <InfoRow label="Order ID" value={orderId} />
          <InfoRow label="Payment" value={getPaymentMethodLabel(paymentMethod)} />
          <InfoRow label="Transaction" value={transactionId} />
          <InfoRow label="Delivery" value={`${deliverySlot} · ${deliveryTime}`} />
          {blockNumber && flatNo ? (
            <InfoRow label="Deliver to" value={`Block ${blockNumber} · Flat ${flatNo}`} />
          ) : null}
          <InfoRow label="Total paid" value={`₹${total.toFixed(0)}`} highlight last />
        </View>
      </View>

      <View
        style={{
          alignSelf: 'center',
          maxWidth: isTablet ? CONTENT_MAX.form : undefined,
          paddingHorizontal: isTablet ? horizontalPadding : 20,
          width: '100%',
        }}>
        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            navigation.replace('TrackOrder', {
              orderId,
              deliverySlot,
              deliveryTime,
              blockNumber,
              flatNo,
              orderedAt,
              status,
            })
          }>
          <Text className="text-sm font-bold text-white">Track order</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', params: { activeTab: 'home' } }],
            })
          }>
          <Text className="text-sm font-bold text-primary">Back to home</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  highlight,
  last,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoDivider]}>
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text
        className={`ml-3 flex-1 text-right text-sm font-semibold ${highlight ? 'text-primary' : 'text-slate-900'}`}
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
  },
  successGlow: {
    backgroundColor: 'rgba(184, 240, 74, 0.25)',
    borderRadius: 999,
    height: 160,
    position: 'absolute',
    top: '28%',
    width: 160,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoDivider: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 16,
  },
});
