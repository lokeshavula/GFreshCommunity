import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { FreshArrivalItem } from '../../types/freshArrival';
import {
  formatArrivalClockTime,
  formatUploadedAgo,
} from '../../services/freshArrivalsService';
import { addToCart } from '../../services/cartService';
import { getCurrentUser } from '../../services/userService';
import { colors } from '../../theme/colors';

const STORY_DURATION = 6000; // 6 seconds per story
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  initialIndex?: number;
  arrivals: FreshArrivalItem[];
  onClose: () => void;
  onGoToCart: () => void;
  onRequireLogin: () => void;
};

export function FreshArrivalsStoryModal({
  visible,
  initialIndex = 0,
  arrivals,
  onClose,
  onGoToCart,
  onRequireLogin,
}: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccessMessage, setCartSuccessMessage] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, arrivals.length - 1)));
      setCartSuccessMessage(null);
    }
  }, [visible, initialIndex, arrivals.length]);

  const goToNextStory = useCallback(() => {
    if (currentIndex < arrivals.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, arrivals.length, onClose]);

  const goToPrevStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      progressAnim.setValue(0);
    }
  }, [currentIndex, progressAnim]);

  // Story Progress Timer
  useEffect(() => {
    if (!visible || arrivals.length === 0) return;

    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    if (!isPaused) {
      animation.start(({ finished }) => {
        if (finished && !isPausedRef.current) {
          goToNextStory();
        }
      });
    }

    return () => {
      animation.stop();
    };
  }, [visible, currentIndex, isPaused, arrivals.length, goToNextStory, progressAnim]);

  const handleTouchHoldStart = () => {
    setIsPaused(true);
  };

  const handleTouchHoldEnd = () => {
    setIsPaused(false);
  };

  const currentItem = arrivals[currentIndex];

  const handleAddToCart = async () => {
    if (!currentItem) return;

    const user = await getCurrentUser();
    if (!user) {
      setIsPaused(true);
      onRequireLogin();
      return;
    }

    setIsAddingToCart(true);
    setIsPaused(true);

    try {
      await addToCart({
        productId: currentItem.productId || currentItem.id,
        name: currentItem.title,
        subtitle: currentItem.subtitle,
        price: currentItem.price || 99,
        unit: currentItem.unit || 'pack',
        image: currentItem.imageUrl,
        quantity: 1,
      });

      setCartSuccessMessage(`Added "${currentItem.title}" to cart! 🛒`);
      setTimeout(() => {
        setCartSuccessMessage(null);
        setIsPaused(false);
      }, 2500);
    } catch (err: any) {
      setCartSuccessMessage(err?.message || 'Failed to add item to cart');
      setTimeout(() => {
        setCartSuccessMessage(null);
        setIsPaused(false);
      }, 3000);
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (!visible || !currentItem) {
    return null;
  }

  const uploadedAgo = formatUploadedAgo(currentItem.arrivedAt);
  const clockTime = formatArrivalClockTime(currentItem.arrivedAt);

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      statusBarTranslucent
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.container}>
        {/* Soft Ambient Light Blurred Background */}
        <Image
          blurRadius={44}
          resizeMode="cover"
          source={{ uri: currentItem.imageUrl }}
          style={styles.ambientBackground}
        />
        <View style={styles.ambientLightOverlay} />

        {/* Foreground Zoomed Clean High-Res Product Photo */}
        <View
          pointerEvents="none"
          style={[
            styles.foregroundPhotoWrap,
            {
              bottom: Math.max(insets.bottom, 16) + 175,
              top: insets.top + 70,
            },
          ]}>
          <Image
            resizeMode="contain"
            source={{ uri: currentItem.imageUrl }}
            style={styles.foregroundPhoto}
          />
        </View>

        {/* Top & Bottom Subtle Luminous Gradients */}
        <View style={[styles.topGradient, { height: insets.top + 130 }]} />
        <View style={styles.bottomGradient} />

        {/* Segmented Progress Bars (Light Theme) */}
        <View style={[styles.progressContainer, { top: insets.top + 10 }]}>
          {arrivals.map((item, idx) => {
            let widthInterpolation: any = '0%';
            if (idx < currentIndex) {
              widthInterpolation = '100%';
            } else if (idx === currentIndex) {
              widthInterpolation = progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              });
            }

            return (
              <View key={item.id || idx} style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: widthInterpolation,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Posh Top Story Header (Light Theme) */}
        <View style={[styles.headerRow, { top: insets.top + 24 }]}>
          <View style={styles.headerInfoGroup}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarEmoji}>{currentItem.categoryEmoji}</Text>
            </View>
            <View style={styles.headerTextGroup}>
              <View style={styles.headerTitleRow}>
                <Text numberOfLines={1} style={styles.headerTitle}>
                  {currentItem.categoryTag.toUpperCase()} • LG Enterprises
                </Text>
                <View style={styles.liveTagPill}>
                  <View style={styles.liveTagDot} />
                  <Text style={styles.liveTagText}>LIVE</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={styles.headerTimestamp}>
                {uploadedAgo} • {clockTime}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Close story viewer"
            accessibilityRole="button"
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={onClose}>
            <Icon color="#0F172A" name="close" size={20} />
          </Pressable>
        </View>

        {/* Left & Right Tap Zones */}
        <View style={styles.tapZonesContainer}>
          <Pressable
            style={styles.leftTapZone}
            onPress={goToPrevStory}
            onPressIn={handleTouchHoldStart}
            onPressOut={handleTouchHoldEnd}
          />
          <Pressable
            style={styles.rightTapZone}
            onPress={goToNextStory}
            onPressIn={handleTouchHoldStart}
            onPressOut={handleTouchHoldEnd}
          />
        </View>

        {/* Success / Feedback Toast */}
        {cartSuccessMessage ? (
          <View style={[styles.toastContainer, { bottom: insets.bottom + 195 }]}>
            <Icon color="#10B981" name="checkmark-circle" size={20} />
            <Text numberOfLines={2} style={styles.toastText}>
              {cartSuccessMessage}
            </Text>
            <Pressable
              style={styles.toastCartBtn}
              onPress={() => {
                onClose();
                onGoToCart();
              }}>
              <Text style={styles.toastCartBtnText}>View Cart →</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Posh Floating Pure Light Glass Card */}
        <View
          style={[
            styles.bottomCard,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 6,
            },
          ]}>
          {/* Badges Row */}
          <View style={styles.cardBadgesRow}>
            <View style={styles.liveBannerBadge}>
              <View style={styles.liveBannerDot} />
              <Text style={styles.liveBannerText}>
                {currentItem.badgeText || 'LIVE • JUST ARRIVED'}
              </Text>
            </View>

            {currentItem.stockQuantityLabel ? (
              <View style={styles.stockBadge}>
                <Icon color="#D97706" name="flash" size={12} />
                <Text style={styles.stockBadgeText}>
                  {currentItem.stockQuantityLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Product Title & Subtitle */}
          <Text style={styles.productTitle}>{currentItem.title}</Text>
          {currentItem.subtitle ? (
            <Text numberOfLines={2} style={styles.productSubtitle}>
              {currentItem.subtitle}
            </Text>
          ) : null}

          {/* Pricing & Add to Cart Action Row */}
          <View style={styles.actionRow}>
            <View>
              <Text style={styles.priceLabel}>TODAY'S ARRIVAL PRICE</Text>
              <View style={styles.priceValueRow}>
                <Text style={styles.priceValue}>
                  ₹{currentItem.price ?? 99}
                </Text>
                <Text style={styles.priceUnit}>
                  / {currentItem.unit || 'pack'}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isAddingToCart}
              style={({ pressed }) => [
                styles.buyNowButton,
                pressed && styles.buyNowButtonPressed,
                isAddingToCart && styles.buyNowButtonDisabled,
              ]}
              onPress={handleAddToCart}>
              {isAddingToCart ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Icon color={colors.white} name="cart" size={18} />
                  <Text style={styles.buyNowText}>Add to Cart</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    height: SCREEN_HEIGHT,
    position: 'relative',
    width: SCREEN_WIDTH,
  },
  ambientBackground: {
    ...StyleSheet.absoluteFill,
    height: '100%',
    opacity: 0.35,
    width: '100%',
  },
  ambientLightOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(248, 250, 252, 0.82)',
  },
  foregroundPhotoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 14,
    position: 'absolute',
    right: 14,
    zIndex: 4,
  },
  foregroundPhoto: {
    borderRadius: 24,
    elevation: 8,
    height: '100%',
    maxWidth: SCREEN_WIDTH - 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: '100%',
  },
  topGradient: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bottomGradient: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    bottom: 0,
    height: 320,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    left: 14,
    position: 'absolute',
    right: 14,
    zIndex: 10,
  },
  progressBarBackground: {
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
    borderRadius: 3,
    flex: 1,
    height: 3.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: '100%',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  headerInfoGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: 10,
  },
  headerAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    width: 40,
  },
  headerAvatarEmoji: {
    fontSize: 20,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  liveTagPill: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECDD3',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3.5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  liveTagDot: {
    backgroundColor: '#EF4444',
    borderRadius: 2.5,
    height: 5,
    width: 5,
  },
  liveTagText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerTimestamp: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1.2,
    elevation: 2,
    height: 38,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    width: 38,
  },
  closeButtonPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.94 }],
  },
  tapZonesContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    zIndex: 5,
  },
  leftTapZone: {
    flex: 1,
    height: '100%',
  },
  rightTapZone: {
    flex: 2,
    height: '100%',
  },
  toastContainer: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderRadius: 18,
    borderWidth: 1.2,
    elevation: 10,
    flexDirection: 'row',
    gap: 10,
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    zIndex: 25,
  },
  toastText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  toastCartBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toastCartBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.2,
    bottom: 0,
    elevation: 12,
    left: 0,
    paddingHorizontal: 22,
    paddingTop: 18,
    position: 'absolute',
    right: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    zIndex: 10,
  },
  cardBadgesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveBannerBadge: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  liveBannerDot: {
    backgroundColor: '#EF4444',
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  liveBannerText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stockBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
  },
  stockBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  productTitle: {
    color: '#0F172A',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  productSubtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  priceLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  priceValueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  priceValue: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  priceUnit: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  buyNowButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    elevation: 6,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buyNowButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.96 }],
  },
  buyNowButtonDisabled: {
    opacity: 0.8,
  },
  buyNowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
