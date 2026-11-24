import { useState } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View, type StyleProp, type ImageStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../theme/colors';

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 0.5;

type ZoomableImageProps = {
  source: ImageSourcePropType;
  width: number;
  height: number;
  style?: StyleProp<ImageStyle>;
  initialScale?: number;
  onZoomChange?: (zoomed: boolean, scale: number) => void;
};

export function ZoomableImage({
  source,
  width,
  height,
  style,
  initialScale = 1,
  onZoomChange,
}: ZoomableImageProps) {
  const startScale = Math.min(Math.max(initialScale, MIN_SCALE), MAX_SCALE);
  const scale = useSharedValue(startScale);
  const savedScale = useSharedValue(startScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [currentScale, setCurrentScale] = useState(startScale);

  const canZoomIn = currentScale < MAX_SCALE - 0.01;
  const canZoomOut = currentScale > MIN_SCALE + 0.01;

  const applyScaleState = (nextScale: number) => {
    const clamped = Math.min(Math.max(nextScale, MIN_SCALE), MAX_SCALE);
    setCurrentScale(clamped);
    onZoomChange?.(clamped > 1.01, clamped);
  };

  const clampScale = (value: number) => {
    'worklet';
    return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
  };

  const finishZoom = (nextScale: number) => {
    'worklet';
    const clamped = clampScale(nextScale);
    if (clamped <= 1.05) {
      scale.value = withTiming(1);
      savedScale.value = 1;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      runOnJS(applyScaleState)(1);
      return;
    }

    scale.value = withTiming(clamped);
    savedScale.value = clamped;
    runOnJS(applyScaleState)(clamped);
  };

  const pinch = Gesture.Pinch()
    .onUpdate(event => {
      const next = clampScale(savedScale.value * event.scale);
      scale.value = next;
      runOnJS(applyScaleState)(next);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      finishZoom(scale.value);
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .averageTouches(true)
    .onUpdate(event => {
      if (scale.value <= 1) {
        return;
      }
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        finishZoom(1);
      } else {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        finishZoom(Math.min(2, MAX_SCALE));
      }
    });

  const composed = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const zoomBy = (delta: number) => {
    const next = Math.min(Math.max(Number((savedScale.value + delta).toFixed(2)), MIN_SCALE), MAX_SCALE);
    if (Math.abs(next - savedScale.value) < 0.01) {
      applyScaleState(savedScale.value);
      return;
    }

    scale.value = withTiming(next);
    savedScale.value = next;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    applyScaleState(next);
  };

  return (
    <View style={[styles.wrap, { height: height + 24 }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.stage, { width, height }, animatedStyle]}>
          <Image
            fadeDuration={0}
            resizeMode="contain"
            source={source}
            style={[{ width, height }, style]}
          />
        </Animated.View>
      </GestureDetector>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Zoom in"
          disabled={!canZoomIn}
          style={[styles.controlButton, !canZoomIn && styles.controlButtonDisabled]}
          onPress={() => zoomBy(ZOOM_STEP)}>
          <Icon color={canZoomIn ? colors.textPrimary : '#94A3B8'} name="add" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel="Zoom out"
          disabled={!canZoomOut}
          style={[styles.controlButton, !canZoomOut && styles.controlButtonDisabled]}
          onPress={() => zoomBy(-ZOOM_STEP)}>
          <Icon color={canZoomOut ? colors.textPrimary : '#94A3B8'} name="remove" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    bottom: 12,
    flexDirection: 'column',
    gap: 8,
    position: 'absolute',
    right: 12,
    zIndex: 2,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 2,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    width: 36,
  },
  controlButtonDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    elevation: 0,
    shadowOpacity: 0,
  },
});
