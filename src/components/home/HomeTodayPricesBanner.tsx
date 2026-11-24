import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';
import { formatPriceDateLabel, toPriceDateKey } from '../../utils/priceDate';

type Props = {
  onPress: () => void;
};

export function HomeTodayPricesBanner({ onPress }: Props) {
  const { shellStyle } = useResponsiveLayout();
  const todayKey = toPriceDateKey();
  const dateLabel = formatPriceDateLabel(todayKey);

  return (
    <View style={[{ marginTop: 16, marginBottom: 8 }, shellStyle('wide')]}>
      <Pressable
        accessibilityLabel="View Today's Fresh Produce and Daily Prices"
        accessibilityRole="button"
        style={styles.card}
        onPress={onPress}>
        {/* Background decorative glowing orbs */}
        <View style={styles.orbLarge} />
        <View style={styles.orbSmall} />
        <View style={styles.accentGlow} />

        {/* Top Header Badge Row */}
        <View style={styles.topRow}>
          <View style={styles.saleBadge}>
            <Icon color="#F59E0B" name="flame" size={13} />
            <Text style={styles.saleBadgeText}>FRESH GROCERY SALE</Text>
          </View>
          <View style={styles.dateBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.dateText}>Live Today · {dateLabel}</Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.title}>Today's Daily Prices & Farm Deals</Text>
        <Text style={styles.subtitle}>
          Compare daily wholesale mandi rates for fresh vegetables & seasonal fruits before ordering.
        </Text>

        {/* Highlight Feature Tags */}
        <View style={styles.tagsRow}>
          <View style={styles.tagItem}>
            <Icon color="#B8F04A" name="leaf" size={12} />
            <Text style={styles.tagText}>Daily Mandi Rates</Text>
          </View>
          <View style={styles.tagItem}>
            <Icon color="#B8F04A" name="nutrition" size={12} />
            <Text style={styles.tagText}>Seasonal Fruits</Text>
          </View>
          <View style={styles.tagItem}>
            <Icon color="#B8F04A" name="flash" size={12} />
            <Text style={styles.tagText}>Best Price Guarantee</Text>
          </View>
        </View>

        {/* Bottom CTA Action Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.subtextWrap}>
            <Icon color="rgba(255, 255, 255, 0.7)" name="shield-checkmark" size={13} />
            <Text style={styles.subtext}>Updated 6:00 AM daily</Text>
          </View>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>View Daily Prices</Text>
            <Icon color="#0A5C3E" name="arrow-forward" size={14} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#064E3B', // Deep rich forest emerald
    borderColor: 'rgba(184, 240, 74, 0.25)',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: 'relative',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  orbLarge: {
    backgroundColor: 'rgba(184, 240, 74, 0.12)',
    borderRadius: 999,
    height: 160,
    position: 'absolute',
    right: -40,
    top: -50,
    width: 160,
  },
  orbSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 999,
    bottom: -30,
    height: 100,
    left: -20,
    position: 'absolute',
    width: 100,
  },
  accentGlow: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 999,
    height: 80,
    position: 'absolute',
    right: 70,
    top: 60,
    width: 80,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saleBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saleBadgeText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    backgroundColor: '#4ADE80',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  dateText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18.5,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
    marginTop: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.76)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tagItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  bottomBar: {
    alignItems: 'center',
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  subtextWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  subtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: '#B8F04A',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButtonText: {
    color: '#064E3B',
    fontSize: 12,
    fontWeight: '800',
  },
});
