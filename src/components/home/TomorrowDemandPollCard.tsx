import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { DemandPollItem, DemandPollSummary } from '../../types/demandPoll';
import {
  castDemandVote,
  fetchActiveDemandPoll,
  submitDemandSuggestion,
} from '../../services/demandPollService';
import { SuggestItemModal } from './SuggestItemModal';
import { useResponsiveLayout } from '../../utils/layout';

function DemandPollOptionRow({
  item,
  totalVotes,
  isVoted,
  isVoting,
  onVote,
}: {
  item: DemandPollItem;
  totalVotes: number;
  isVoted: boolean;
  isVoting: boolean;
  onVote: () => void;
}) {
  const percentage = totalVotes > 0 ? Math.round((item.voteCount / totalVotes) * 100) : 0;
  const progressAnim = useSharedValue(0);
  const rowScale = useSharedValue(1);

  useEffect(() => {
    progressAnim.value = withTiming(percentage, { duration: 600 });
  }, [percentage, progressAnim]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rowScale.value }],
  }));

  const handlePress = () => {
    rowScale.value = withSequence(
      withSpring(0.96, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    onVote();
  };

  const isOrdered = item.status === 'ordered' || item.status === 'procured';

  return (
    <Animated.View style={[styles.optionCardWrap, animatedScaleStyle]}>
      <Pressable
        accessibilityLabel={`Vote for ${item.title}, currently ${item.voteCount} votes`}
        accessibilityRole="button"
        disabled={isVoting}
        style={[
          styles.optionCard,
          isVoted && styles.optionCardVoted,
          isOrdered && styles.optionCardOrdered,
        ]}
        onPress={handlePress}>
        {/* Animated Progress Fill Bar */}
        <Animated.View
          style={[
            styles.progressFill,
            isVoted ? styles.progressFillVoted : styles.progressFillDefault,
            animatedFillStyle,
          ]}
        />

        {/* Content Row */}
        <View style={styles.optionContent}>
          {/* Emoji Avatar */}
          <View style={[styles.emojiBadge, isVoted && styles.emojiBadgeVoted]}>
            <Text style={styles.emojiText}>{item.emoji}</Text>
          </View>

          {/* Title & Info */}
          <View className="flex-1 ml-3 mr-2">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text
                numberOfLines={1}
                style={[styles.optionTitle, isVoted && styles.optionTitleVoted]}>
                {item.title}
              </Text>
              {isOrdered ? (
                <View style={styles.orderedBadge}>
                  <Icon color="#059669" name="checkmark-circle" size={11} />
                  <Text style={styles.orderedBadgeText}>ORDERED</Text>
                </View>
              ) : null}
            </View>

            {item.subtitle ? (
              <Text numberOfLines={1} style={styles.optionSubtitle}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>

          {/* Vote Percentage & Counter Badge */}
          <View style={styles.voteStatsWrap}>
            <View className="flex-row items-baseline gap-1">
              <Text style={[styles.voteCountText, isVoted && styles.voteCountTextVoted]}>
                {item.voteCount}
              </Text>
              <Text style={styles.voteCountUnit}>votes</Text>
            </View>

            <View style={[styles.pctPill, isVoted && styles.pctPillVoted]}>
              {isVoted ? (
                <Icon color="#FFFFFF" name="checkmark" size={10} style={{ marginRight: 2 }} />
              ) : null}
              <Text style={[styles.pctText, isVoted && styles.pctTextVoted]}>
                {percentage}%
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function TomorrowDemandPollCard() {
  const { shellStyle } = useResponsiveLayout();
  const [summary, setSummary] = useState<DemandPollSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [votingItemId, setVotingItemId] = useState<string | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const loadPoll = async () => {
    try {
      const data = await fetchActiveDemandPoll();
      setSummary(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPoll();
  }, []);

  const handleVote = async (itemId: string) => {
    setVotingItemId(itemId);
    try {
      const updated = await castDemandVote(itemId);
      setSummary(updated);
    } catch {
      // ignore
    } finally {
      setVotingItemId(null);
    }
  };

  const handleSuggestSubmit = async (title: string, note?: string) => {
    await submitDemandSuggestion(title, note);
  };

  if (isLoading && !summary) {
    return null;
  }

  if (!summary || summary.items.length === 0) {
    return null;
  }

  const userHasVoted = Boolean(summary.userVotedItemId);

  return (
    <View style={[styles.container, shellStyle('wide')]}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View className="flex-row items-center gap-2">
          <View style={styles.liveDotRing}>
            <View style={styles.liveDot} />
          </View>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text style={styles.headerEyebrow}>COMMUNITY DEMAND POLL</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>What should we bring tomorrow?</Text>
          </View>
        </View>

        <View style={styles.cutoffPill}>
          <Icon color="#F59E0B" name="time-outline" size={12} />
          <Text style={styles.cutoffText}>Closes 10 PM</Text>
        </View>
      </View>

      {/* Community Status Banner */}
      <View style={styles.statusBanner}>
        <View className="flex-row items-center gap-1.5 flex-1">
          <Text style={{ fontSize: 13 }}>🔥</Text>
          <Text style={styles.statusBannerText}>
            <Text style={{ fontWeight: '800', color: '#0F172A' }}>{summary.totalVotes} votes</Text> from your neighbours so far
          </Text>
        </View>
        <Text style={styles.targetDateText}>{summary.targetDateLabel}</Text>
      </View>

      {/* Options List */}
      <View style={styles.optionsList}>
        {summary.items.map(item => (
          <DemandPollOptionRow
            key={item.id}
            isVoted={item.id === summary.userVotedItemId}
            isVoting={votingItemId === item.id}
            item={item}
            totalVotes={summary.totalVotes}
            onVote={() => handleVote(item.id)}
          />
        ))}
      </View>

      {/* Footer Actions */}
      <View style={styles.footerRow}>
        <Text style={styles.votePromptText}>
          {userHasVoted
            ? '✓ Your vote is counted! You can tap another item to change it.'
            : 'Tap any item above to vote for tomorrow’s harvest!'}
        </Text>

        <Pressable
          accessibilityRole="button"
          style={styles.suggestBtn}
          onPress={() => setShowSuggestModal(true)}>
          <Icon color={colors.primary} name="add-circle-outline" size={14} />
          <Text style={styles.suggestBtnText}>Suggest item</Text>
        </Pressable>
      </View>

      {/* Suggest Item Modal */}
      <SuggestItemModal
        visible={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        onSubmit={handleSuggestSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1.2,
    elevation: 4,
    marginBottom: 10,
    marginTop: 10,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveDotRing: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    height: 20,
    justifyContent: 'center',
    marginTop: 2,
    width: 20,
  },
  liveDot: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  headerEyebrow: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  cutoffPill: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cutoffText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBanner: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBannerText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  targetDateText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  optionsList: {
    gap: 9,
  },
  optionCardWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 58,
    overflow: 'hidden',
    position: 'relative',
  },
  optionCardVoted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  optionCardOrdered: {
    borderColor: '#059669',
  },
  progressFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressFillDefault: {
    backgroundColor: 'rgba(226, 232, 240, 0.45)',
  },
  progressFillVoted: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  optionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 2,
  },
  emojiBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  emojiBadgeVoted: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  emojiText: {
    fontSize: 20,
  },
  optionTitle: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  optionTitleVoted: {
    color: '#065F46',
    fontWeight: '800',
  },
  orderedBadge: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  orderedBadgeText: {
    color: '#059669',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  optionSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  voteStatsWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  voteCountText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  voteCountTextVoted: {
    color: '#059669',
    fontSize: 14,
  },
  voteCountUnit: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  pctPill: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    flexDirection: 'row',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  pctPillVoted: {
    backgroundColor: '#059669',
  },
  pctText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },
  pctTextVoted: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 4,
  },
  votePromptText: {
    color: '#64748B',
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    marginRight: 8,
  },
  suggestBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
