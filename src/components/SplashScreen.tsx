import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { preloadAppAssets } from '../utils/preloadAssets';
import { useResponsiveLayout } from '../utils/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPLASH_DURATION_MS = 3800;

const LOGO = require('../../assests/lg-enterprises-logo.png');

/** Brand colors for the splash experience */
const splash = {
  primary: '#0A5C3E',
  primaryDark: '#063D29',
  primaryLight: '#1A8F5C',
  accent: '#B8F04A',
  accentDark: '#8BC34A',
  blue: '#003B73',
  blueDark: '#002952',
  gold: '#F59E0B',
  surface: '#F6F9F7',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const { formMaxWidth, horizontalPadding, isTablet, isCompact } = useResponsiveLayout();
  const logoHeight = isCompact ? 180 : isTablet ? 280 : 220;

  // -------------------------------------------------------------
  // Animation Shared Values
  // -------------------------------------------------------------
  const screenOpacity = useSharedValue(1);

  // 1. Cart arrival animation
  const cartTranslateX = useSharedValue(-SCREEN_WIDTH - 80);
  const cartTranslateY = useSharedValue(0);
  const cartScale = useSharedValue(0.85);
  const cartRotation = useSharedValue(-12); // tilted forward while rushing
  const wheelsRotation = useSharedValue(0);
  const speedLinesOpacity = useSharedValue(1);
  const groceriesBounce = useSharedValue(0);

  // 2. Impact & Shockwave
  const shockwaveScale = useSharedValue(0.1);
  const shockwaveOpacity = useSharedValue(0);
  const shockwave2Scale = useSharedValue(0.1);
  const shockwave2Opacity = useSharedValue(0);

  // 3. Sparkle burst
  const sparkleProgress = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);

  // 4. Logo & Content Reveal
  const logoCardScale = useSharedValue(0.7);
  const logoCardOpacity = useSharedValue(0);
  const logoCardTranslateY = useSharedValue(20);
  const shimmerTranslate = useSharedValue(-SCREEN_WIDTH);
  const taglineOpacity = useSharedValue(0);
  const taglinesTranslateY = useSharedValue(18);
  const pillsOpacity = useSharedValue(0);
  const pillsTranslateY = useSharedValue(18);

  // 5. Idle breathing for docked cart + logo
  const idleFloatY = useSharedValue(0);

  // 6. Progress bar
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    try {
      preloadAppAssets();
    } catch (e) {
      console.warn('preloadAppAssets failed', e);
    }
  }, []);

  useEffect(() => {
    // -----------------------------------------------------------
    // Step 1: Cart rushes in from outside left (0ms - 900ms)
    // -----------------------------------------------------------
    wheelsRotation.value = withTiming(1080, {
      duration: 1000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    groceriesBounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 120 }),
        withTiming(4, { duration: 120 }),
        withTiming(0, { duration: 100 })
      ),
      3,
      true
    );

    // Cart translates from outside to center dock position
    cartTranslateX.value = withSequence(
      withTiming(0, {
        duration: 850,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
      // Micro recoil & settle
      withSpring(0, { damping: 10, stiffness: 220 })
    );

    // Cart tilt leveling out
    cartRotation.value = withSequence(
      withTiming(-12, { duration: 400 }),
      withTiming(6, { duration: 350 }), // slight brake tilt
      withSpring(0, { damping: 12, stiffness: 200 })
    );

    // Speed lines fade out upon arrival
    speedLinesOpacity.value = withDelay(
      650,
      withTiming(0, { duration: 250 })
    );

    // -----------------------------------------------------------
    // Step 2: Impact / Sitting into the Logo (850ms - 1300ms)
    // -----------------------------------------------------------
    // Cart landing squish and spring
    cartScale.value = withDelay(
      800,
      withSequence(
        withTiming(1.22, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 12, stiffness: 180 })
      )
    );

    // Shockwave pulse 1
    shockwaveOpacity.value = withDelay(
      820,
      withSequence(
        withTiming(0.85, { duration: 100 }),
        withTiming(0, { duration: 550, easing: Easing.out(Easing.ease) })
      )
    );
    shockwaveScale.value = withDelay(
      820,
      withTiming(2.8, { duration: 650, easing: Easing.out(Easing.cubic) })
    );

    // Shockwave pulse 2
    shockwave2Opacity.value = withDelay(
      940,
      withSequence(
        withTiming(0.6, { duration: 100 }),
        withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) })
      )
    );
    shockwave2Scale.value = withDelay(
      940,
      withTiming(2.3, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

    // Sparkle burst
    sparkleOpacity.value = withDelay(
      840,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 450 })
      )
    );
    sparkleProgress.value = withDelay(
      840,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) })
    );

    // -----------------------------------------------------------
    // Step 3: Logo Card reveal & light sweep (800ms - 1600ms)
    // -----------------------------------------------------------
    logoCardOpacity.value = withDelay(
      750,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) })
    );
    logoCardScale.value = withDelay(
      750,
      withSpring(1, { damping: 14, stiffness: 150 })
    );
    logoCardTranslateY.value = withDelay(
      750,
      withSpring(0, { damping: 14, stiffness: 160 })
    );

    // Shimmer sweep across the logo card
    shimmerTranslate.value = withDelay(
      1100,
      withTiming(SCREEN_WIDTH * 1.5, {
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
      })
    );

    // -----------------------------------------------------------
    // Step 4: Taglines, Badges, and Progress Bar (1200ms - 3200ms)
    // -----------------------------------------------------------
    taglineOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 500 })
    );
    taglinesTranslateY.value = withDelay(
      1200,
      withSpring(0, { damping: 15, stiffness: 140 })
    );

    pillsOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 500 })
    );
    pillsTranslateY.value = withDelay(
      1400,
      withSpring(0, { damping: 15, stiffness: 140 })
    );

    // Gentle floating idle animation after docking
    idleFloatY.value = withDelay(
      1600,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );

    // Bottom progress fill
    progressWidth.value = withDelay(
      300,
      withTiming(100, { duration: 3100, easing: Easing.inOut(Easing.quad) })
    );

    // -----------------------------------------------------------
    // Step 5: Smooth exit into Main App
    // -----------------------------------------------------------
    const exitTimer = setTimeout(() => {
      screenOpacity.value = withTiming(
        0,
        { duration: 450, easing: Easing.inOut(Easing.ease) },
        finished => {
          if (finished) {
            runOnJS(onFinish)();
          }
        }
      );
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(exitTimer);
  }, [
    cartRotation,
    cartScale,
    cartTranslateX,
    cartTranslateY,
    groceriesBounce,
    idleFloatY,
    logoCardOpacity,
    logoCardScale,
    logoCardTranslateY,
    onFinish,
    pillsOpacity,
    pillsTranslateY,
    progressWidth,
    screenOpacity,
    shimmerTranslate,
    shockwave2Opacity,
    shockwave2Scale,
    shockwaveOpacity,
    shockwaveScale,
    sparkleOpacity,
    sparkleProgress,
    speedLinesOpacity,
    taglineOpacity,
    taglinesTranslateY,
    wheelsRotation,
  ]);

  // -------------------------------------------------------------
  // Animated Styles
  // -------------------------------------------------------------
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const cartWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cartTranslateX.value },
      { translateY: cartTranslateY.value + idleFloatY.value },
      { scale: cartScale.value },
      { rotate: `${cartRotation.value}deg` },
    ],
  }));

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wheelsRotation.value}deg` }],
  }));

  const groceriesStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: groceriesBounce.value }],
  }));

  const speedLinesStyle = useAnimatedStyle(() => ({
    opacity: speedLinesOpacity.value,
    transform: [{ translateX: -interpolate(speedLinesOpacity.value, [0, 1], [30, 0]) }],
  }));

  const shockwave1Style = useAnimatedStyle(() => ({
    opacity: shockwaveOpacity.value,
    transform: [{ scale: shockwaveScale.value }],
  }));

  const shockwave2Style = useAnimatedStyle(() => ({
    opacity: shockwave2Opacity.value,
    transform: [{ scale: shockwave2Scale.value }],
  }));

  const logoCardAnimStyle = useAnimatedStyle(() => ({
    opacity: logoCardOpacity.value,
    transform: [
      { scale: logoCardScale.value },
      { translateY: logoCardTranslateY.value + idleFloatY.value * 0.5 },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }, { rotate: '25deg' }],
  }));

  const taglineAnimStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglinesTranslateY.value }],
  }));

  const pillsAnimStyle = useAnimatedStyle(() => ({
    opacity: pillsOpacity.value,
    transform: [{ translateY: pillsTranslateY.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Sparkle particle styles
  const createSparkleStyle = (angleDeg: number, distance: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const targetX = Math.cos(rad) * distance;
    const targetY = Math.sin(rad) * distance;

    return useAnimatedStyle(() => ({
      opacity: sparkleOpacity.value,
      transform: [
        { translateX: sparkleProgress.value * targetX },
        { translateY: sparkleProgress.value * targetY },
        { scale: interpolate(sparkleProgress.value, [0, 0.5, 1], [0.3, 1.3, 0.4]) },
        { rotate: `${sparkleProgress.value * 180}deg` },
      ],
    }));
  };

  const sparkle1 = createSparkleStyle(45, 52);
  const sparkle2 = createSparkleStyle(135, 52);
  const sparkle3 = createSparkleStyle(225, 48);
  const sparkle4 = createSparkleStyle(315, 48);
  const sparkle5 = createSparkleStyle(90, 56);
  const sparkle6 = createSparkleStyle(270, 56);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.screen, screenStyle]}>
        {/* Ambient Glow Orbs */}
        <View style={[styles.orb, styles.orbGreen]} />
        <View style={[styles.orb, styles.orbBlue]} />
        <View style={[styles.orb, styles.orbGold]} />

        <SafeAreaView
          style={[
            styles.content,
            {
              maxWidth: formMaxWidth,
              paddingHorizontal: horizontalPadding,
              width: '100%',
              alignSelf: 'center',
            },
          ]}>
          {/* =========================================================
              MAIN LOGO CARD WITH EMBEDDED DOCKED CART
             ========================================================= */}
          <Animated.View style={[styles.logoCard, logoCardAnimStyle]}>
            {/* Shimmer light sweep */}
            <Animated.View style={[styles.shimmerBar, shimmerStyle]} />

            {/* CART DOCKING STAGE */}
            <View style={styles.cartStageContainer}>
              {/* Shockwave Rings on Impact */}
              <Animated.View style={[styles.shockwaveRing, shockwave1Style]} />
              <Animated.View
                style={[
                  styles.shockwaveRing,
                  { borderColor: splash.accentDark },
                  shockwave2Style,
                ]}
              />

              {/* Sparkle Particle Bursts */}
              <Animated.View style={[styles.sparkleParticle, sparkle1]}>
                <Icon color={splash.accentDark} name="sparkles" size={16} />
              </Animated.View>
              <Animated.View style={[styles.sparkleParticle, sparkle2]}>
                <Icon color={splash.gold} name="star" size={14} />
              </Animated.View>
              <Animated.View style={[styles.sparkleParticle, sparkle3]}>
                <Icon color={splash.primaryLight} name="sparkles" size={14} />
              </Animated.View>
              <Animated.View style={[styles.sparkleParticle, sparkle4]}>
                <Icon color={splash.blue} name="flash" size={14} />
              </Animated.View>
              <Animated.View style={[styles.sparkleParticle, sparkle5]}>
                <Icon color={splash.accentDark} name="leaf" size={14} />
              </Animated.View>
              <Animated.View style={[styles.sparkleParticle, sparkle6]}>
                <Icon color={splash.gold} name="sparkles" size={15} />
              </Animated.View>

              {/* DOCK PODIUM GLOW */}
              <View style={styles.dockPodium}>
                <View style={styles.dockInnerGlow} />
              </View>

              {/* THE ANIMATED SHOPPING CART */}
              <Animated.View style={[styles.cartWrapper, cartWrapperStyle]}>
                {/* Wind / Speed Lines trailing behind */}
                <Animated.View style={[styles.speedLinesContainer, speedLinesStyle]}>
                  <View style={[styles.speedLine, { width: 34, top: 8 }]} />
                  <View style={[styles.speedLine, { width: 46, top: 22 }]} />
                  <View style={[styles.speedLine, { width: 28, top: 36 }]} />
                </Animated.View>

                {/* Groceries bouncing inside the cart */}
                <Animated.View style={[styles.groceriesContainer, groceriesStyle]}>
                  <View style={styles.appleItem}>
                    <Icon color="#EF4444" name="nutrition" size={16} />
                  </View>
                  <View style={styles.leafItem}>
                    <Icon color={splash.accentDark} name="leaf" size={15} />
                  </View>
                  <View style={styles.drinkItem}>
                    <Icon color={splash.blue} name="cube" size={13} />
                  </View>
                </Animated.View>

                {/* Cart Body */}
                <View style={styles.cartBody}>
                  <Icon color={splash.card} name="cart" size={40} />
                </View>

                {/* Spinning Cart Wheels */}
                <View style={styles.wheelsRow}>
                  <Animated.View style={[styles.cartWheel, wheelStyle]}>
                    <Icon color={splash.primaryDark} name="aperture" size={14} />
                  </Animated.View>
                  <Animated.View style={[styles.cartWheel, wheelStyle]}>
                    <Icon color={splash.primaryDark} name="aperture" size={14} />
                  </Animated.View>
                </View>
              </Animated.View>
            </View>

            {/* BRAND BADGE HEADER */}
            <View style={styles.brandBadge}>
              <View style={styles.brandBadgeDot} />
              <Text style={styles.brandBadgeText}>FRESH COMMUNITY STORE</Text>
            </View>

            {/* MAIN LOGO IMAGE */}
            <Image
              resizeMode="contain"
              source={LOGO}
              style={[styles.logoImage, { height: logoHeight }]}
            />
          </Animated.View>

          {/* =========================================================
              TAGLINE & BRAND VALUES
             ========================================================= */}
          <Animated.View style={[styles.taglineRow, taglineAnimStyle]}>
            <View style={styles.taglineLine} />
            <Text style={styles.taglineText}>YOUR STORE • EVERYDAY MORE</Text>
            <View style={styles.taglineLine} />
          </Animated.View>

          <Animated.View style={[styles.valuesRow, pillsAnimStyle]}>
            <ValuePill color={splash.primary} icon="flash" label="Fast Delivery" />
            <View style={styles.valueDivider} />
            <ValuePill color={splash.accentDark} icon="leaf" label="100% Farm Fresh" />
            <View style={styles.valueDivider} />
            <ValuePill color={splash.blue} icon="shield-checkmark" label="Trusted Value" />
          </Animated.View>
        </SafeAreaView>

        {/* =========================================================
            BOTTOM PROGRESS BAR & LOADING
           ========================================================= */}
        <View style={styles.footer}>
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
          </View>
          <View style={styles.loadingRow}>
            <LoadingDot color={splash.accentDark} delay={0} />
            <LoadingDot color={splash.primary} delay={160} />
            <LoadingDot color={splash.blue} delay={320} />
            <Text style={styles.loadingText}>Loading your market experience...</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function ValuePill({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.valuePill}>
      <View style={[styles.valuePillIconBg, { backgroundColor: `${color}18` }]}>
        <Icon color={color} name={icon} size={14} />
      </View>
      <Text style={[styles.valueLabel, { color: splash.text }]}>{label}</Text>
    </View>
  );
}

function LoadingDot({ color, delay }: { color: string; delay: number }) {
  const scale = useSharedValue(0.65);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0.65, { duration: 400, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0.35, { duration: 400, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.loadingDot, { backgroundColor: color }, animatedStyle]} />
  );
}

// ---------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    backgroundColor: splash.surface,
    flex: 1,
  },
  screen: {
    backgroundColor: splash.surface,
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    borderRadius: 999,
    position: 'absolute',
  },
  orbGreen: {
    backgroundColor: 'rgba(10, 92, 62, 0.09)',
    bottom: -60,
    height: 320,
    left: -80,
    width: 320,
  },
  orbBlue: {
    backgroundColor: 'rgba(0, 59, 115, 0.08)',
    height: 280,
    right: -70,
    top: -40,
    width: 280,
  },
  orbGold: {
    backgroundColor: 'rgba(245, 158, 11, 0.07)',
    height: 180,
    left: '30%',
    top: '25%',
    width: 180,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  logoCard: {
    alignItems: 'center',
    backgroundColor: splash.card,
    borderColor: '#E8EDF2',
    borderRadius: 32,
    borderWidth: 1.5,
    elevation: 12,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 28,
    position: 'relative',
    shadowColor: splash.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    width: '100%',
  },
  shimmerBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    bottom: -50,
    position: 'absolute',
    top: -50,
    width: 60,
    zIndex: 10,
  },
  cartStageContainer: {
    alignItems: 'center',
    height: 105,
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    width: 140,
  },
  shockwaveRing: {
    borderColor: splash.primaryLight,
    borderRadius: 999,
    borderWidth: 2,
    height: 90,
    position: 'absolute',
    width: 90,
  },
  sparkleParticle: {
    position: 'absolute',
    zIndex: 8,
  },
  dockPodium: {
    alignItems: 'center',
    backgroundColor: '#EDF5EE',
    borderColor: '#D4EAD6',
    borderRadius: 999,
    borderWidth: 1.5,
    bottom: 6,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    width: 100,
  },
  dockInnerGlow: {
    backgroundColor: 'rgba(10, 92, 62, 0.14)',
    borderRadius: 999,
    height: 14,
    width: 76,
  },
  cartWrapper: {
    alignItems: 'center',
    height: 90,
    justifyContent: 'center',
    position: 'relative',
    width: 90,
    zIndex: 5,
  },
  speedLinesContainer: {
    left: -48,
    position: 'absolute',
    top: 10,
    zIndex: 1,
  },
  speedLine: {
    backgroundColor: splash.accentDark,
    borderRadius: 99,
    height: 3,
    marginBottom: 5,
    opacity: 0.85,
  },
  groceriesContainer: {
    flexDirection: 'row',
    left: 20,
    position: 'absolute',
    top: 4,
    zIndex: 4,
  },
  appleItem: {
    backgroundColor: '#FFE4E6',
    borderRadius: 99,
    padding: 2,
    transform: [{ rotate: '-12deg' }],
  },
  leafItem: {
    backgroundColor: '#DCFCE7',
    borderRadius: 99,
    marginLeft: -4,
    padding: 2,
    top: -4,
    transform: [{ rotate: '18deg' }],
  },
  drinkItem: {
    backgroundColor: '#E0F2FE',
    borderRadius: 99,
    marginLeft: -3,
    padding: 2,
    top: 2,
  },
  cartBody: {
    alignItems: 'center',
    backgroundColor: splash.primary,
    borderColor: splash.accent,
    borderRadius: 22,
    borderWidth: 2,
    elevation: 6,
    height: 60,
    justifyContent: 'center',
    shadowColor: splash.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    width: 60,
  },
  wheelsRow: {
    bottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 14,
    position: 'absolute',
    right: 14,
    zIndex: 6,
  },
  cartWheel: {
    alignItems: 'center',
    backgroundColor: splash.card,
    borderColor: splash.primary,
    borderRadius: 99,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  brandBadgeDot: {
    backgroundColor: splash.primaryLight,
    borderRadius: 99,
    height: 6,
    width: 6,
  },
  brandBadgeText: {
    color: splash.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  logoImage: {
    maxWidth: 500,
    width: '100%',
  },
  taglineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  taglineLine: {
    backgroundColor: '#CBD5E1',
    height: 1.5,
    width: 24,
  },
  taglineText: {
    color: splash.blueDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  valuesRow: {
    alignItems: 'center',
    backgroundColor: splash.card,
    borderColor: '#E8EDF2',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  valuePill: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  valuePillIconBg: {
    alignItems: 'center',
    borderRadius: 99,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  valueDivider: {
    backgroundColor: '#E2E8F0',
    height: 24,
    width: 1,
  },
  footer: {
    alignItems: 'center',
    bottom: 30,
    left: 24,
    position: 'absolute',
    right: 24,
  },
  progressBarTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 99,
    height: 4,
    marginBottom: 14,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    backgroundColor: splash.primary,
    borderRadius: 99,
    height: '100%',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  loadingText: {
    color: splash.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
});
