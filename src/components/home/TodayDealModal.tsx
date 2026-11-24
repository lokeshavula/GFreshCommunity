import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onViewAllRates: () => void;
};

export function TodayDealModal({ visible, onClose, onViewAllRates }: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.dragPill} />

          {/* Minimal Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text style={styles.title}>Today's Fresh Deals</Text>
              <Text style={styles.sub}>Direct mandi wholesale rates for today</Text>
            </View>

            <Pressable hitSlop={10} style={styles.closeBtn} onPress={onClose}>
              <Icon color="#64748B" name="close" size={18} />
            </Pressable>
          </View>

          {/* Flash items list */}
          <View style={styles.dealsList}>
            <View style={styles.dealRow}>
              <View style={styles.emojiStage}>
                <Text style={{ fontSize: 24 }}>🍅</Text>
              </View>
              <View className="flex-1 ml-3 mr-2">
                <Text numberOfLines={1} style={styles.dealItemTitle}>Fresh Country Tomatoes</Text>
                <Text style={styles.dealItemSub}>₹28/kg • Regular ₹40</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>30% OFF</Text>
              </View>
            </View>

            <View style={styles.dealRow}>
              <View style={styles.emojiStage}>
                <Text style={{ fontSize: 24 }}>🥔</Text>
              </View>
              <View className="flex-1 ml-3 mr-2">
                <Text numberOfLines={1} style={styles.dealItemTitle}>Agra Fresh Potatoes</Text>
                <Text style={styles.dealItemSub}>₹32/kg • Regular ₹45</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>28% OFF</Text>
              </View>
            </View>

            <View style={styles.dealRow}>
              <View style={styles.emojiStage}>
                <Text style={{ fontSize: 24 }}>🧅</Text>
              </View>
              <View className="flex-1 ml-3 mr-2">
                <Text numberOfLines={1} style={styles.dealItemTitle}>Nasik Red Onions</Text>
                <Text style={styles.dealItemSub}>₹35/kg • Regular ₹50</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>30% OFF</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              onClose();
              onViewAllRates();
            }}>
            <Text style={styles.actionBtnText}>View Full Daily Price List →</Text>
          </Pressable>
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
  title: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  sub: {
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
  dealsList: {
    gap: 8,
    marginTop: 6,
  },
  dealRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emojiStage: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dealItemTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  dealItemSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  discountBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '800',
  },
  actionBtn: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
