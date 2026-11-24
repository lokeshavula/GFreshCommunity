import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { DemandPollItem, DemandPollSummary } from '../../types/demandPoll';
import {
  castDemandVote,
  fetchActiveDemandPoll,
  submitDemandSuggestion,
} from '../../services/demandPollService';
import { SuggestItemModal } from './SuggestItemModal';

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
    progressAnim.value = withTiming(percentage, { duration: 450 });
  }, [percentage, progressAnim]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rowScale.value }],
  }));

  const handlePress = () => {
    rowScale.value = withSequence(
      withSpring(0.97, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );
    onVote();
  };

  const isOrdered = item.status === 'ordered' || item.status === 'procured';

  return (
    <Animated.View style={[styles.optionCardWrap, animatedScaleStyle]}>
      <Pressable
        accessibilityLabel={`Vote for ${item.title}`}
        accessibilityRole="button"
        disabled={isVoting}
        style={[
          styles.optionCard,
          isVoted && styles.optionCardVoted,
        ]}
        onPress={handlePress}>
        {/* Subtle Progress Fill */}
        <Animated.View
          style={[
            styles.progressFill,
            isVoted ? styles.progressFillVoted : styles.progressFillDefault,
            animatedFillStyle,
          ]}
        />

        {/* Content Row */}
        <View style={styles.optionContent}>
          {/* Emoji */}
          <View style={[styles.emojiCircle, isVoted && styles.emojiCircleVoted]}>
            <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
          </View>

          {/* Title & Subtitle */}
          <View className="flex-1 ml-3 mr-2">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text
                numberOfLines={1}
                style={[styles.optionTitle, isVoted && styles.optionTitleVoted]}>
                {item.title}
              </Text>
              {isOrdered ? (
                <Text style={styles.orderedTag}>✓ ORDERED</Text>
              ) : null}
            </View>

            {item.subtitle ? (
              <Text numberOfLines={1} style={styles.optionSubtitle}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>

          {/* Right Stats & Selection Icon */}
          <View className="flex-row items-center gap-2">
            <View style={styles.voteStatsWrap}>
              <Text style={[styles.voteCount, isVoted && styles.voteCountVoted]}>
                {item.voteCount}
              </Text>
              <Text style={styles.votePct}>{percentage}%</Text>
            </View>

            <View style={[styles.checkCircle, isVoted && styles.checkCircleVoted]}>
              {isVoted ? (
                <Icon color="#FFFFFF" name="checkmark" size={12} />
              ) : (
                <View style={styles.unvotedDot} />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onVoteUpdated?: () => void;
};

export function TomorrowDemandPollModal({ visible, onClose, onVoteUpdated }: Props) {
  const insets = useSafeAreaInsets();
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
    if (visible) {
      loadPoll();
    }
  }, [visible]);

  const handleVote = async (itemId: string) => {
    setVotingItemId(itemId);
    try {
      const updated = await castDemandVote(itemId);
      setSummary(updated);
      onVoteUpdated?.();
    } catch {
      // ignore
    } finally {
      setVotingItemId(null);
    }
  };

  const handleSuggestSubmit = async (title: string, note?: string) => {
    await submitDemandSuggestion(title, note);
  };

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Drag Handle */}
          <View style={styles.dragPill} />

          {/* Minimal Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text style={styles.headerTitle}>What should we bring tomorrow?</Text>
              <Text style={styles.headerSub}>
                {summary?.totalVotes || 0} neighbour votes • Closes at 10 PM
              </Text>
            </View>

            <Pressable hitSlop={10} style={styles.closeBtn} onPress={onClose}>
              <Icon color="#64748B" name="close" size={18} />
            </Pressable>
          </View>

          {/* Scrollable Poll Options List */}
          {isLoading && !summary ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingText}>Loading options...</Text>
            </View>
          ) : (
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={styles.optionsScroll}>
              <View style={styles.optionsList}>
                {summary?.items.map(item => (
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
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <Pressable
              accessibilityRole="button"
              style={styles.suggestBtn}
              onPress={() => setShowSuggestModal(true)}>
              <Icon color="#475569" name="add-circle-outline" size={15} />
              <Text style={styles.suggestBtnText}>Suggest item</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.doneBtn}
              onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>

        {/* Suggest Item Modal */}
        <SuggestItemModal
          visible={showSuggestModal}
          onClose={() => setShowSuggestModal(false)}
          onSubmit={handleSuggestSubmit}
        />
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
    maxHeight: '90%',
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
  headerTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
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
  optionsScroll: {
    maxHeight: 360,
  },
  optionsList: {
    gap: 8,
    marginVertical: 4,
  },
  optionCardWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  optionCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
    overflow: 'hidden',
    position: 'relative',
  },
  optionCardVoted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1.2,
  },
  progressFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressFillDefault: {
    backgroundColor: 'rgba(226, 232, 240, 0.35)',
  },
  progressFillVoted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  optionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 2,
  },
  emojiCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  emojiCircleVoted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  optionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  optionTitleVoted: {
    color: '#065F46',
    fontWeight: '800',
  },
  orderedTag: {
    color: '#059669',
    fontSize: 8.5,
    fontWeight: '800',
  },
  optionSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  voteStatsWrap: {
    alignItems: 'flex-end',
  },
  voteCount: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  voteCountVoted: {
    color: '#059669',
  },
  votePct: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkCircleVoted: {
    backgroundColor: '#059669',
  },
  unvotedDot: {
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  suggestBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },
  doneBtn: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
