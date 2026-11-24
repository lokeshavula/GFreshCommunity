import React, { useRef, useState } from 'react';
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
import Icon from 'react-native-vector-icons/Ionicons';

import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

export type LifestyleCardItem = {
  id: string;
  title: string;
  subtitle: string;
  sectionName: string;
  productImage: number;
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
  arrowColor: string;
};

const LIFESTYLE_CARDS: LifestyleCardItem[] = [
  {
    id: 'high-protein',
    title: 'High protein',
    subtitle: 'Healthy everyday essentials',
    sectionName: 'High Protein',
    productImage: require('../../../assests/lifestyle/products_protein.png'),
    backgroundColor: '#FFF6DC',
    titleColor: '#3E1C00',
    subtitleColor: '#5C3818',
    arrowColor: '#3E1C00',
  },
  {
    id: 'gut-friendly',
    title: 'Gut-friendly',
    subtitle: 'Nourish your gut,\nnaturally',
    sectionName: 'Gut-Friendly',
    productImage: require('../../../assests/lifestyle/products_gut.png'),
    backgroundColor: '#FFF0E5',
    titleColor: '#4A120A',
    subtitleColor: '#5C332B',
    arrowColor: '#4A120A',
  },
  {
    id: 'low-calorie',
    title: 'Low calorie',
    subtitle: 'Light on calories,\nbig on taste',
    sectionName: 'Low Calorie',
    productImage: require('../../../assests/lifestyle/products_calorie.png'),
    backgroundColor: '#FFF8E6',
    titleColor: '#3B2300',
    subtitleColor: '#5C431C',
    arrowColor: '#3B2300',
  },
  {
    id: 'low-sugar',
    title: 'Low sugar treats',
    subtitle: 'Guilt-free\nindulgences',
    sectionName: 'Low Sugar Treats',
    productImage: require('../../../assests/lifestyle/products_sugar.png'),
    backgroundColor: '#FFF1E8',
    titleColor: '#461318',
    subtitleColor: '#5C3036',
    arrowColor: '#461318',
  },
];

type Props = {
  onSelectCategory?: (card: LifestyleCardItem) => void;
};

export function HomeShopByLifestyle({ onSelectCategory }: Props) {
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
    if (index !== activeIndex && index >= 0 && index < LIFESTYLE_CARDS.length) {
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
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.sectionTitle}>Shop By Lifestyle</Text>
        </View>
      </View>

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
          {LIFESTYLE_CARDS.map(card => (
            <Pressable
              key={card.id}
              accessibilityHint={`Browse ${card.title} products`}
              accessibilityLabel={`${card.title} - ${card.subtitle}`}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: card.backgroundColor,
                  height: cardHeight,
                  width: cardWidth,
                },
                pressed && styles.cardPressed,
              ]}
              onPress={() => onSelectCategory?.(card)}>
              {/* Product imagery on the right side */}
              <View style={styles.imageContainer}>
                <Image
                  resizeMode="cover"
                  source={card.productImage}
                  style={styles.productImage}
                />
              </View>

              {/* Native content and typography on the left side */}
              <View style={styles.contentWrap}>
                <View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cardTitle,
                      { color: card.titleColor },
                      isTablet && styles.cardTitleTablet,
                    ]}>
                    {card.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[styles.cardSubtitle, { color: card.subtitleColor }]}>
                    {card.subtitle}
                  </Text>
                </View>

                {/* Circular Arrow Button */}
                <View style={styles.arrowButton}>
                  <Icon color={card.arrowColor} name="arrow-forward" size={17} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Pagination Dots */}
      <View style={styles.dotsRow}>
        {LIFESTYLE_CARDS.map((card, index) => (
          <View
            key={card.id}
            style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  titleWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  carouselContainer: {
    overflow: 'hidden',
    width: '100%',
    borderRadius: 24,
  },
  card: {
    borderColor: '#E8DFD3',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
  },
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '58%',
    height: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  contentWrap: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingLeft: 20,
    maxWidth: '52%',
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 25,
  },
  cardTitleTablet: {
    fontSize: 25,
    lineHeight: 30,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 5,
    lineHeight: 16.5,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
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
