import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { FreshArrivalItem } from '../../types/freshArrival';
import { formatShortArrivalTag } from '../../services/freshArrivalsService';
import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  arrivals: FreshArrivalItem[];
  onSelectStory: (index: number) => void;
  onWatchAll: () => void;
};

export function FreshArrivalsStoryBar({
  arrivals,
  onSelectStory,
  onWatchAll,
}: Props) {
  const { shellStyle, deviceSize } = useResponsiveLayout();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.45,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.85,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, pulseOpacity]);

  if (!arrivals || arrivals.length === 0) {
    return null;
  }

  const isTabletDevice = deviceSize === 'tablet' || deviceSize === 'largeTablet';
  const visibleCardsCount = isTabletDevice ? 6 : 4;
  const isDistributed = arrivals.length <= visibleCardsCount;
  const itemGap = isTabletDevice ? 16 : 14;
  const ringSize = isTabletDevice ? 72 : 62;
  const avatarSize = ringSize - 5;

  return (
    <View style={[styles.wrap, shellStyle('wide')]}>
      <View style={styles.card}>
        {/* Posh Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.beaconContainer}>
              <Animated.View
                style={[
                  styles.liveDotRing,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={styles.liveDot} />
            </View>
            <View>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.sectionTitle}>Fresh Arrivals Today</Text>
                <View style={styles.liveBadgePill}>
                  <Icon color="#059669" name="flash" size={10} style={styles.flashIcon} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Real stock photos • Just unloaded
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Play all fresh arrivals stories"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.watchAllButton,
              pressed && styles.watchAllButtonPressed,
            ]}
            onPress={onWatchAll}>
            <View style={styles.playIconCircle}>
              <Icon color="#FFFFFF" name="play" size={10} style={styles.playIcon} />
            </View>
            <Text style={styles.watchAllText}>Play All</Text>
          </Pressable>
        </View>

        {/* Stories rail */}
        <ScrollView
          horizontal
          bounces={!isDistributed}
          contentContainerStyle={[
            styles.scrollContainer,
            isDistributed && styles.scrollContainerDistributed,
          ]}
          showsHorizontalScrollIndicator={false}>
          {arrivals.map((item, index) => {
            const shortTag = formatShortArrivalTag(item.arrivedAt);
            const isVeryFresh = shortTag.includes('m ago') || shortTag === 'NOW';
            const isLast = index === arrivals.length - 1;

            return (
              <Pressable
                key={item.id || index}
                accessibilityLabel={`View story for ${item.title}`}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.storyItem,
                  !isDistributed && { marginRight: isLast ? 0 : itemGap },
                  pressed && styles.storyItemPressed,
                ]}
                onPress={() => onSelectStory(index)}>
                {/* Luxury Double Ring */}
                <View
                  style={[
                    styles.storyRing,
                    isVeryFresh ? styles.storyRingFresh : styles.storyRingStandard,
                    {
                      borderRadius: ringSize / 2,
                      height: ringSize,
                      width: ringSize,
                    },
                  ]}>
                  <View
                    style={[
                      styles.avatarInner,
                      {
                        borderRadius: avatarSize / 2,
                        height: avatarSize,
                        width: avatarSize,
                      },
                    ]}>
                    <Image
                      accessibilityLabel={item.title}
                      resizeMode="cover"
                      source={{ uri: item.imageUrl }}
                      style={styles.avatarImage}
                    />

                    {/* Glassmorphic subtle vignette */}
                    <View style={styles.imageScrim} />

                    {/* Floating Category Emoji */}
                    <View style={styles.emojiBadge}>
                      <Text style={styles.emojiText}>{item.categoryEmoji}</Text>
                    </View>
                  </View>
                </View>

                {/* Time tag badge */}
                <View
                  style={[
                    styles.timeBadge,
                    isVeryFresh ? styles.timeBadgeFresh : styles.timeBadgeStandard,
                  ]}>
                  <Text
                    style={[
                      styles.timeBadgeText,
                      isVeryFresh
                        ? styles.timeBadgeTextFresh
                        : styles.timeBadgeTextStandard,
                    ]}>
                    {isVeryFresh ? `🔥 ${shortTag}` : shortTag}
                  </Text>
                </View>

                {/* Category Label */}
                <Text
                  numberOfLines={1}
                  style={[styles.itemLabel, { maxWidth: ringSize + 14 }]}>
                  {item.categoryTag.charAt(0).toUpperCase() +
                    item.categoryTag.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6ECE9',
    borderRadius: 22,
    borderWidth: 1.2,
    elevation: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#063D29',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  beaconContainer: {
    alignItems: 'center',
    height: 16,
    justifyContent: 'center',
    position: 'relative',
    width: 16,
  },
  liveDot: {
    backgroundColor: '#10B981',
    borderRadius: 4.5,
    height: 9,
    width: 9,
  },
  liveDotRing: {
    backgroundColor: '#6EE7B7',
    borderRadius: 9,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  titleBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  flashIcon: {
    marginRight: 2,
  },
  liveBadgePill: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  liveBadgeText: {
    color: '#059669',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  watchAllButton: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
  },
  watchAllButtonPressed: {
    backgroundColor: '#DCFCE7',
    transform: [{ scale: 0.96 }],
  },
  playIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  playIcon: {
    marginLeft: 1,
  },
  watchAllText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  scrollContainerDistributed: {
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  storyItem: {
    alignItems: 'center',
  },
  storyItemPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  storyRing: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.2,
    justifyContent: 'center',
    padding: 2.5,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  storyRingFresh: {
    borderColor: '#F43F5E',
  },
  storyRingStandard: {
    borderColor: '#059669',
  },
  avatarInner: {
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  imageScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  emojiBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderRadius: 9,
    borderWidth: 1,
    bottom: 1.5,
    elevation: 2,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    width: 18,
  },
  emojiText: {
    fontSize: 10,
  },
  timeBadge: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -8,
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    zIndex: 2,
  },
  timeBadgeFresh: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  timeBadgeStandard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  timeBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  timeBadgeTextFresh: {
    color: '#E11D48',
  },
  timeBadgeTextStandard: {
    color: '#475569',
  },
  itemLabel: {
    color: '#1E293B',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 15,
    marginTop: 5,
    textAlign: 'center',
  },
});
