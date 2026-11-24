import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { fetchActiveDemandPoll } from '../../services/demandPollService';
import { DemandPollSummary } from '../../types/demandPoll';
import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  onPress: () => void;
  refreshTrigger?: number;
};

export function TomorrowDemandPollBanner({ onPress, refreshTrigger }: Props) {
  const { shellStyle } = useResponsiveLayout();
  const [summary, setSummary] = useState<DemandPollSummary | null>(null);

  useEffect(() => {
    fetchActiveDemandPoll().then(data => setSummary(data)).catch(() => {});
  }, [refreshTrigger]);

  const votedItem = summary?.items.find(it => it.id === summary?.userVotedItemId);
  const totalVotes = summary?.totalVotes || 250;

  return (
    <View style={[styles.wrapper, shellStyle('wide')]}>
      <Pressable
        accessibilityLabel="Open tomorrow demand voting popup"
        accessibilityRole="button"
        style={styles.banner}
        onPress={onPress}>
        {/* Background Subtle Gradient Shape */}
        <View style={styles.bgGlow} />

        <View className="flex-row items-center justify-between z-10">
          {/* Left Emojis Stack & Info */}
          <View className="flex-row items-center flex-1 mr-3">
            {/* Overlapping Emoji Circle Stack */}
            <View style={styles.emojiStackWrap}>
              <View style={[styles.emojiBubble, { zIndex: 4, left: 0 }]}>
                <Text style={styles.emojiText}>🥭</Text>
              </View>
              <View style={[styles.emojiBubble, { zIndex: 3, left: 18 }]}>
                <Text style={styles.emojiText}>🥑</Text>
              </View>
              <View style={[styles.emojiBubble, { zIndex: 2, left: 36 }]}>
                <Text style={styles.emojiText}>🐟</Text>
              </View>
              <View style={[styles.emojiBubble, { zIndex: 1, left: 54 }]}>
                <Text style={styles.emojiText}>🦐</Text>
              </View>
            </View>

            {/* Info Text */}
            <View className="flex-1 ml-16">
              <View className="flex-row items-center gap-1.5">
                <View style={styles.liveDot} />
                <Text style={styles.eyebrow}>COMMUNITY POLL</Text>
                <View style={styles.timerPill}>
                  <Text style={styles.timerText}>CLOSES 10 PM</Text>
                </View>
              </View>

              <Text numberOfLines={1} style={styles.title}>
                What should we bring tomorrow?
              </Text>

              <Text numberOfLines={1} style={styles.subtitle}>
                {votedItem ? (
                  <Text style={{ color: '#059669', fontWeight: '700' }}>
                    ✓ You voted {votedItem.emoji} {votedItem.title.split(' ')[0]} • View live ranks
                  </Text>
                ) : (
                  <Text>
                    🔥 <Text style={{ fontWeight: '700', color: '#0F172A' }}>{totalVotes} votes</Text> • Tap to vote for tomorrow
                  </Text>
                )}
              </Text>
            </View>
          </View>

          {/* Right Action Button */}
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>
              {votedItem ? 'View' : 'Vote'}
            </Text>
            <Icon color="#FFFFFF" name="arrow-forward" size={12} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
  },
  banner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A7F3D0',
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 3,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  bgGlow: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    height: 120,
    opacity: 0.7,
    position: 'absolute',
    right: -20,
    top: -20,
    width: 120,
  },
  emojiStackWrap: {
    height: 38,
    position: 'relative',
    width: 38,
  },
  emojiBubble: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 2,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    top: 3,
    width: 32,
  },
  emojiText: {
    fontSize: 16,
  },
  liveDot: {
    backgroundColor: '#EF4444',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  eyebrow: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  timerText: {
    color: '#B45309',
    fontSize: 8,
    fontWeight: '800',
  },
  title: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 1,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1.5,
  },
  actionBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 7,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
