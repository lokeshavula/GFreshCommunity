import { useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type PromoSlide = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  image: number;
  tone: string;
};

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: '1',
    badge: '35% OFF',
    title: 'Fresh Grocery\nMega Sale',
    subtitle: 'Farm to home in under 30 minutes',
    cta: 'Shop Now',
    image: require('../../../assests/fruits.png'),
    tone: '#E8F8EE',
  },
  {
    id: '2',
    badge: 'NEW',
    title: 'Seasonal\nVegetables',
    subtitle: 'Handpicked daily from local farms',
    cta: 'Explore',
    image: require('../../../assests/vegetables.png'),
    tone: '#FFF8E7',
  },
  {
    id: '3',
    badge: 'BEST DEAL',
    title: 'Snacks &\nBeverages',
    subtitle: 'Buy 2 get 1 on selected brands',
    cta: 'Grab Deal',
    image: require('../../../assests/chips.png'),
    tone: '#F0F7FF',
  },
];

type Props = {
  onPressSlide?: (slide: PromoSlide) => void;
};

export function HomePromoCarousel({ onPressSlide }: Props = {}) {
  const { width, isTablet, horizontalPadding, shellStyle, deviceSize, contentMaxWidth } =
    useResponsiveLayout();
  const [activeIndex, setActiveIndex] = useState(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const shellWidth = Math.min(width, contentMaxWidth);
  const fallbackCardWidth = Math.max(280, shellWidth - horizontalPadding * 2);
  const cardWidth = measuredWidth > 0 ? measuredWidth : fallbackCardWidth;

  const cardHeight =
    deviceSize === 'largeTablet' ? 210 : isTablet ? 190 : deviceSize === 'compact' ? 145 : 160;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / Math.max(cardWidth, 1));
    if (index !== activeIndex && index >= 0 && index < PROMO_SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - measuredWidth) > 1) {
      setMeasuredWidth(w);
    }
  };

  return (
    <View style={[styles.wrap, shellStyle('wide')]}>
      <View onLayout={handleLayout} style={[styles.carouselContainer, { height: cardHeight }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          alwaysBounceVertical={false}
          bounces={false}
          decelerationRate="fast"
          directionalLockEnabled={true}
          nestedScrollEnabled={true}
          overScrollMode="never"
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          snapToAlignment="center"
          snapToInterval={cardWidth}
          onScroll={handleScroll}>
          {PROMO_SLIDES.map(slide => (
            <Pressable
              key={slide.id}
              style={[
                styles.card,
                {
                  backgroundColor: slide.tone,
                  height: cardHeight,
                  width: cardWidth,
                },
              ]}
              onPress={() => onPressSlide?.(slide)}>
              <View style={styles.cardContent}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{slide.badge}</Text>
                </View>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.cardTitle,
                    isTablet ? styles.cardTitleTablet : styles.cardTitlePhone,
                  ]}>
                  {slide.title}
                </Text>
                <Text numberOfLines={1} style={styles.cardSubtitle}>
                  {slide.subtitle}
                </Text>
                <View style={styles.cta}>
                  <Text style={styles.ctaText}>{slide.cta}</Text>
                </View>
              </View>
              <View style={styles.imageWrap}>
                <Image
                  resizeMode="contain"
                  source={slide.image}
                  style={[styles.image, isTablet ? styles.imageTablet : styles.imagePhone]}
                />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Pagination Dots */}
      <View style={styles.dotsRow}>
        {PROMO_SLIDES.map((slide, index) => (
          <View
            key={slide.id}
            style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
  },
  carouselContainer: {
    overflow: 'hidden',
    width: '100%',
  },
  card: {
    alignItems: 'center',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 18,
    paddingVertical: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardTitle: {
    color: '#0F172A',
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 8,
  },
  cardTitlePhone: {
    fontSize: 20,
    lineHeight: 25,
  },
  cardTitleTablet: {
    fontSize: 24,
    lineHeight: 30,
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 4,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
  },
  image: {
    height: 125,
    width: 120,
  },
  imagePhone: {
    height: 125,
    width: 120,
  },
  imageTablet: {
    height: 160,
    width: 150,
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    borderRadius: 999,
    height: 5.5,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  dotInactive: {
    backgroundColor: '#CBD5E1',
    width: 5.5,
  },
});
