import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { calculateOrderTotal } from '../../services/orderService';
import { GfmOrder, OrderStatus } from '../../types/gfm';
import { colors } from '../../theme/colors';
import { CONTENT_MAX } from '../../utils/layout';

type Props = {
  orders: GfmOrder[];
  bottomPadding: number;
  updatingId: string | null;
  onUpdateStatus: (order: GfmOrder, status: OrderStatus) => void;
};

const NEXT_STATUS: Partial<Record<string, OrderStatus>> = {
  placed: 'packing',
  confirmed: 'packing',
  packing: 'ready',
  ready: 'arriving',
  arriving: 'delivered',
  shipped: 'delivered',
};

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value === 'delivered') return { bg: '#ECFDF3', text: '#166534' };
  if (value === 'cancelled') return { bg: '#FEF2F2', text: '#B91C1C' };
  if (value === 'arriving' || value === 'ready') return { bg: '#ECFDF3', text: '#15803D' };
  return { bg: '#FFF7ED', text: '#C2410C' };
}

export function AdminOrdersTab({ orders, bottomPadding, updatingId, onUpdateStatus }: Props) {
  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: bottomPadding,
        alignSelf: 'center',
        maxWidth: CONTENT_MAX.wide,
        width: '100%',
      }}
      showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-slate-900">Order logs</Text>
      <Text className="mt-1 text-sm text-slate-500">Track packing, delivery and status updates</Text>

      <View className="mt-5" style={{ gap: 12 }}>
        {orders.length === 0 ? (
          <View style={styles.empty}>
            <Icon color={colors.textMuted} name="receipt-outline" size={36} />
            <Text className="mt-3 text-sm font-semibold text-slate-500">No orders yet</Text>
          </View>
        ) : (
          orders.map(order => {
            const tone = statusTone(order.status);
            const next = NEXT_STATUS[order.status?.toLowerCase?.() ?? ''];
            const total = calculateOrderTotal(order.items);

            return (
              <View key={order.id} style={styles.card}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-slate-900">{order.orderId}</Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {order.customerName} · {order.mobileNumber}
                    </Text>
                    <Text className="mt-0.5 text-xs text-slate-400">
                      Block {order.blockNumber}, Flat {order.flatNo}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                    <Text style={{ color: tone.text, fontSize: 10, fontWeight: '700' }}>
                      {(order.status || 'placed').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500">
                    {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.deliverySlot}{' '}
                    {order.deliveryTime}
                  </Text>
                  <Text className="text-sm font-bold text-slate-900">₹{total}</Text>
                </View>

                {next ? (
                  <Pressable
                    disabled={updatingId === order.id}
                    style={[styles.nextButton, updatingId === order.id && { opacity: 0.6 }]}
                    onPress={() => onUpdateStatus(order, next)}>
                    <Icon color={colors.white} name="arrow-forward-circle-outline" size={16} />
                    <Text className="ml-2 text-xs font-bold text-white">
                      Mark as {next}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nextButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 40,
  },
});
