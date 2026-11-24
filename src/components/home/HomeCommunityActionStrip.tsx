import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  onOpenCommunityPoll: () => void;
  onOpenGroupBuying: () => void;
  onOpenTodayDeal: () => void;
};

export function HomeCommunityActionStrip({
  onOpenCommunityPoll,
  onOpenGroupBuying,
  onOpenTodayDeal,
}: Props) {
  const { shellStyle } = useResponsiveLayout();

  return (
    <View style={[{ marginTop: 12, marginBottom: 4 }, shellStyle('wide')]}>
      <View style={styles.container}>
        {/* 1. Community Poll */}
        <Pressable
          accessibilityLabel="Community Poll"
          accessibilityRole="button"
          style={styles.card}
          onPress={onOpenCommunityPoll}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Icon color="#059669" name="stats-chart" size={15} />
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
            </View>
          </View>
          <Text numberOfLines={1} style={styles.title}>
            Poll
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            Vote items
          </Text>
        </Pressable>

        {/* 2. Group Buying */}
        <Pressable
          accessibilityLabel="Group Buying"
          accessibilityRole="button"
          style={styles.card}
          onPress={onOpenGroupBuying}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Icon color="#EA580C" name="people" size={16} />
            </View>
            <View style={styles.saveTag}>
              <Text style={styles.saveTagText}>SAVE</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.title}>
            Group Buy
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            Bulk crates
          </Text>
        </Pressable>

        {/* 3. Today's Deals */}
        <Pressable
          accessibilityLabel="Today's Deals"
          accessibilityRole="button"
          style={styles.card}
          onPress={onOpenTodayDeal}>
          <View style={styles.cardTop}>
            <View style={[styles.iconCircle, { backgroundColor: '#FAF5FF' }]}>
              <Icon color="#7C3AED" name="flash" size={15} />
            </View>
            <View style={styles.hotTag}>
              <Text style={styles.hotTagText}>RATES</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.title}>
            Daily Deals
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            Fresh rates
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  liveIndicator: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    height: 14,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  liveDot: {
    backgroundColor: '#EF4444',
    borderRadius: 2.5,
    height: 5,
    width: 5,
  },
  saveTag: {
    backgroundColor: '#FFEDD5',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  saveTagText: {
    color: '#C2410C',
    fontSize: 8,
    fontWeight: '800',
  },
  hotTag: {
    backgroundColor: '#EDE9FE',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  hotTagText: {
    color: '#6D28D9',
    fontSize: 8,
    fontWeight: '800',
  },
  title: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});
