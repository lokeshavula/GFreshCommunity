import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { Product } from '../../types/product';
import { getImageSource } from '../../utils/imageSource';
import { getProductIconMeta } from '../../utils/itemIcons';
import { colors } from '../../theme/colors';

type PopularProductCardProps = {
  product: Product;
  width: number | `${number}%`;
  quantity?: number;
  onPress: () => void;
  onAddToCart: (event: any) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

export function PopularProductCard({
  product,
  width,
  quantity = 0,
  onPress,
  onAddToCart,
  onIncrement,
  onDecrement,
  isFavorite = false,
  onToggleFavorite,
}: PopularProductCardProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  const mrp = Math.round(product.price * 1.25);
  const discount = Math.max(Math.round(((mrp - product.price) / mrp) * 100), 10);
  const savings = mrp - product.price;
  const iconMeta = getProductIconMeta(product);
  const numericWidth = typeof width === 'number' ? width : 120;
  const compact = numericWidth < 130;

  // Responsive image dimensions
  const imageStageHeight = Math.round(Math.min(Math.max(numericWidth * 0.92, 94), 126));
  const imageSize = Math.round(Math.min(Math.max(numericWidth * 0.58, 56), 84));

  const handleHeartPress = (e: any) => {
    e.stopPropagation();
    setFavorite(prev => !prev);
    onToggleFavorite?.();
  };

  return (
    <Pressable
      accessibilityLabel={`${product.name}, price ₹${product.price}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}>
      {/* Top Image Stage */}
      <View style={[styles.imageStage, { height: imageStageHeight }]}>
        {/* Subtle Ambient Radial Glow */}
        <View style={styles.glowCircle} />

        {/* Product Visual */}
        {product.image != null ? (
          <Image
            fadeDuration={0}
            resizeMode="contain"
            source={getImageSource(product.image)}
            style={{ height: imageSize, width: imageSize }}
          />
        ) : (
          <Icon color={iconMeta.color} name={iconMeta.icon} size={compact ? 32 : 40} />
        )}

        {/* Top Badges Row */}
        <View style={styles.topRow}>
          {/* Discount Pill */}
          <View style={[styles.discountBadge, compact && styles.discountBadgeCompact]}>
            <Icon color="#065F46" name="flash" size={compact ? 8.5 : 9.5} style={{ marginRight: 2 }} />
            <Text style={[styles.discountText, compact && styles.discountTextCompact]}>
              {discount}% OFF
            </Text>
          </View>

          {/* Favorite Heart Button */}
          <Pressable
            hitSlop={6}
            style={[styles.heartButton, compact && styles.heartButtonCompact]}
            onPress={handleHeartPress}>
            <Icon
              color={favorite ? '#EF4444' : '#94A3B8'}
              name={favorite ? 'heart' : 'heart-outline'}
              size={compact ? 13 : 15}
            />
          </Pressable>
        </View>

        {/* Fast Delivery Badge */}
        <View style={[styles.etaBadge, compact && styles.etaBadgeCompact]}>
          <Icon color="#0F172A" name="time" size={compact ? 8.5 : 9.5} style={{ marginRight: 2.5 }} />
          <Text style={[styles.etaText, compact && styles.etaTextCompact]}>10 MINS</Text>
        </View>
      </View>

      {/* Card Content Body */}
      <View style={[styles.body, compact && styles.bodyCompact]}>
        {/* Unit Tag */}
        <View style={[styles.unitChip, compact && styles.unitChipCompact]}>
          <Text style={[styles.unitText, compact && styles.unitTextCompact]}>
            {product.unit ? `1 ${product.unit}` : '1 pack'}
          </Text>
        </View>

        {/* Title & Subtitle */}
        <Text numberOfLines={1} style={[styles.name, compact && styles.nameCompact]}>
          {product.name}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, compact && styles.subtitleCompact]}>
          {product.subtitle || 'Farm fresh quality'}
        </Text>

        {/* Rating & Social Proof */}
        <View style={styles.ratingRow}>
          <Icon color="#F59E0B" name="star" size={compact ? 9.5 : 10.5} />
          <Text style={[styles.ratingNumber, compact && styles.ratingNumberCompact]}>4.8</Text>
          <Text style={[styles.ratingCount, compact && styles.ratingCountCompact]}>(120+)</Text>
        </View>

        {/* Footer with Price and Quick-Commerce Action Button */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={[styles.currentPrice, compact && styles.currentPriceCompact]}>
                ₹{product.price.toFixed(0)}
              </Text>
              <Text style={[styles.originalMrp, compact && styles.originalMrpCompact]}>
                ₹{mrp}
              </Text>
            </View>
            <Text style={[styles.saveTag, compact && styles.saveTagCompact]}>
              Save ₹{savings}
            </Text>
          </View>

          {/* Stepper or ADD + button */}
          {quantity > 0 ? (
            <View style={[styles.stepperWrap, compact && styles.stepperWrapCompact]}>
              <Pressable
                accessibilityLabel="Decrease quantity"
                hitSlop={6}
                style={[styles.stepBtn, compact && styles.stepBtnCompact]}
                onPress={e => {
                  e.stopPropagation();
                  onDecrement?.();
                }}>
                <Icon color="#FFFFFF" name="remove" size={compact ? 12 : 13} />
              </Pressable>
              <Text style={[styles.stepQty, compact && styles.stepQtyCompact]}>
                {quantity}
              </Text>
              <Pressable
                accessibilityLabel="Increase quantity"
                hitSlop={6}
                style={[styles.stepBtn, compact && styles.stepBtnCompact]}
                onPress={e => {
                  e.stopPropagation();
                  onIncrement?.();
                }}>
                <Icon color="#FFFFFF" name="add" size={compact ? 12 : 13} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityLabel={`Add ${product.name} to cart`}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addButton,
                compact && styles.addButtonCompact,
                pressed && styles.addButtonPressed,
              ]}
              onPress={e => {
                e.stopPropagation();
                onAddToCart(e);
              }}>
              <Text style={[styles.addText, compact && styles.addTextCompact]}>ADD</Text>
              <Icon color="#16A34A" name="add" size={compact ? 11 : 12} style={{ marginLeft: 1 }} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 3,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  cardPressed: {
    borderColor: '#CBD5E1',
    transform: [{ scale: 0.985 }],
  },
  imageStage: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  glowCircle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: '75%',
    opacity: 0.75,
    position: 'absolute',
    width: '75%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 6,
    position: 'absolute',
    right: 6,
    top: 6,
    zIndex: 3,
  },
  discountBadge: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderRadius: 6,
    borderWidth: 0.8,
    flexDirection: 'row',
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  discountBadgeCompact: {
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  discountText: {
    color: '#065F46',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  discountTextCompact: {
    fontSize: 8.5,
  },
  heartButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    elevation: 1,
    height: 24,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    width: 24,
  },
  heartButtonCompact: {
    height: 22,
    width: 22,
  },
  etaBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 0.5,
    bottom: 5,
    flexDirection: 'row',
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    zIndex: 2,
  },
  etaBadgeCompact: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  etaText: {
    color: '#0F172A',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  etaTextCompact: {
    fontSize: 8,
  },
  body: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    paddingBottom: 9,
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  bodyCompact: {
    paddingBottom: 8,
    paddingHorizontal: 7,
    paddingTop: 6,
  },
  unitChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 3,
    paddingHorizontal: 4.5,
    paddingVertical: 1.5,
  },
  unitChipCompact: {
    marginBottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  unitText: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
  },
  unitTextCompact: {
    fontSize: 9,
  },
  name: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  nameCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1.5,
  },
  subtitleCompact: {
    fontSize: 9.5,
    marginTop: 1,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2.5,
    marginTop: 4,
  },
  ratingNumber: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingNumberCompact: {
    fontSize: 9.5,
  },
  ratingCount: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '500',
  },
  ratingCountCompact: {
    fontSize: 9,
  },
  footer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceContainer: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'flex-end',
    marginRight: 4,
  },
  priceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 3,
  },
  currentPrice: {
    color: '#0F172A',
    flexShrink: 0,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  currentPriceCompact: {
    fontSize: 12.5,
  },
  originalMrp: {
    color: '#94A3B8',
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  originalMrpCompact: {
    fontSize: 9.5,
  },
  saveTag: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  saveTagCompact: {
    fontSize: 8.5,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
    borderRadius: 8,
    borderWidth: 1.1,
    flexDirection: 'row',
    flexShrink: 0,
    height: 28,
    justifyContent: 'center',
    minWidth: 52,
    paddingHorizontal: 6,
  },
  addButtonCompact: {
    height: 26,
    minWidth: 46,
    paddingHorizontal: 4,
  },
  addButtonPressed: {
    backgroundColor: '#DCFCE7',
    transform: [{ scale: 0.96 }],
  },
  addText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  addTextCompact: {
    fontSize: 10.5,
  },
  stepperWrap: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 8,
    flexDirection: 'row',
    flexShrink: 0,
    height: 28,
    justifyContent: 'space-between',
    minWidth: 56,
    paddingHorizontal: 3,
  },
  stepperWrapCompact: {
    height: 26,
    minWidth: 50,
    paddingHorizontal: 2,
  },
  stepBtn: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    width: 17,
  },
  stepBtnCompact: {
    height: 24,
    width: 15,
  },
  stepQty: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    paddingHorizontal: 2,
    textAlign: 'center',
  },
  stepQtyCompact: {
    fontSize: 11,
    paddingHorizontal: 1,
  },
});
