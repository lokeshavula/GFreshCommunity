import { useMemo } from 'react';
import { Platform, useWindowDimensions, ViewStyle } from 'react-native';

/** Breakpoints covering phones → large iPads. */
export const BREAKPOINTS = {
  compact: 360,
  phone: 430,
  largePhone: 600,
  tablet: 768,
  largeTablet: 1024,
} as const;

export const TABLET_BREAKPOINT = BREAKPOINTS.tablet;

/** Readable content widths for different screen types. */
export const CONTENT_MAX = {
  form: 520,
  page: 720,
  wide: 980,
  full: 1100,
} as const;

export type ContentWidth = keyof typeof CONTENT_MAX;

export type DeviceSize = 'compact' | 'phone' | 'largePhone' | 'tablet' | 'largeTablet';

function resolveDeviceSize(width: number, height: number, isPad: boolean): DeviceSize {
  const shortest = Math.min(width, height);
  if (isPad || shortest >= BREAKPOINTS.tablet || width >= BREAKPOINTS.largeTablet) {
    return width >= BREAKPOINTS.largeTablet || shortest >= BREAKPOINTS.largeTablet
      ? 'largeTablet'
      : 'tablet';
  }
  if (shortest >= BREAKPOINTS.largePhone || width >= BREAKPOINTS.tablet) {
    return 'tablet';
  }
  if (width >= BREAKPOINTS.phone) {
    return 'largePhone';
  }
  if (width < BREAKPOINTS.compact) {
    return 'compact';
  }
  return 'phone';
}

function paddingForSize(size: DeviceSize): number {
  switch (size) {
    case 'compact':
      return 16;
    case 'phone':
      return 20;
    case 'largePhone':
      return 22;
    case 'tablet':
      return 28;
    case 'largeTablet':
      return 32;
  }
}

function maxWidthForSize(size: DeviceSize, key: ContentWidth): number | undefined {
  if (size === 'compact' || size === 'phone' || size === 'largePhone') {
    return undefined;
  }
  if (size === 'largeTablet' && key === 'wide') {
    return CONTENT_MAX.full;
  }
  if (size === 'largeTablet' && key === 'page') {
    return CONTENT_MAX.wide;
  }
  return CONTENT_MAX[key];
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isPad = Platform.OS === 'ios' && Platform.isPad;
  const deviceSize = resolveDeviceSize(width, height, isPad);
  const isTablet = deviceSize === 'tablet' || deviceSize === 'largeTablet' || isPad;
  const isLandscape = width > height;
  const horizontalPadding = paddingForSize(deviceSize);

  const contentMaxWidth = maxWidthForSize(deviceSize, 'wide') ?? width;
  const formMaxWidth = maxWidthForSize(deviceSize, 'form') ?? Math.min(width, CONTENT_MAX.form);
  const pageMaxWidth = maxWidthForSize(deviceSize, 'page') ?? width;

  /** Soft scale for type / icon sizing across devices (0.92–1.12). */
  const scale = useMemo(() => {
    if (deviceSize === 'compact') return 0.92;
    if (deviceSize === 'largePhone') return 1.04;
    if (deviceSize === 'tablet') return 1.06;
    if (deviceSize === 'largeTablet') return 1.1;
    return 1;
  }, [deviceSize]);

  const shellStyle = (widthKey: ContentWidth = 'page'): ViewStyle => {
    const maxW = maxWidthForSize(deviceSize, widthKey);
    return {
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: horizontalPadding,
      ...(maxW != null ? { maxWidth: maxW } : null),
    };
  };

  return {
    width,
    height,
    deviceSize,
    isTablet,
    isLandscape,
    isPad,
    isCompact: deviceSize === 'compact',
    contentMaxWidth,
    formMaxWidth,
    pageMaxWidth,
    horizontalPadding,
    scale,
    shellStyle,
  };
}

/** How many grid columns fit for a given minimum item width (phones + tablets). */
export function useGridColumns(options: {
  minItemWidth: number;
  phoneColumns: number;
  maxColumns?: number;
  gap?: number;
  padding?: number;
  maxContentWidth?: number;
}) {
  const { width, isTablet, isCompact, horizontalPadding, deviceSize } = useResponsiveLayout();
  const {
    minItemWidth,
    phoneColumns,
    maxColumns = 8,
    gap = 12,
    padding = horizontalPadding,
    maxContentWidth = deviceSize === 'largeTablet' ? CONTENT_MAX.full : CONTENT_MAX.wide,
  } = options;

  return useMemo(() => {
    const capped = Math.min(width, isTablet ? maxContentWidth : width);
    const usableWidth = Math.max(0, capped - padding * 2);

    const fitColumns = (desired: number) => {
      let cols = Math.max(1, desired);
      while (cols > 1) {
        const totalGap = gap * (cols - 1);
        const itemWidth = (usableWidth - totalGap) / cols;
        // Keep requested columns unless cards would be unusably narrow
        if (itemWidth >= minItemWidth * 0.72) {
          break;
        }
        cols -= 1;
      }
      return cols;
    };

    let columns: number;
    if (!isTablet) {
      // Phones: prefer phoneColumns (e.g. 3). Only reduce on very narrow / dense grids.
      let desired = phoneColumns;
      if (isCompact && phoneColumns >= 4) {
        desired = phoneColumns - 1;
      }
      columns = fitColumns(desired);
    } else {
      const byWidth = Math.floor((usableWidth + gap) / (minItemWidth + gap));
      columns = Math.max(phoneColumns, Math.min(maxColumns, byWidth));
      columns = fitColumns(columns);
    }

    const totalGap = gap * Math.max(0, columns - 1);
    return {
      columns,
      itemWidth: (usableWidth - totalGap) / columns,
      contentWidth: usableWidth + padding * 2,
      gap,
      padding,
    };
  }, [
    gap,
    isCompact,
    isTablet,
    maxContentWidth,
    maxColumns,
    minItemWidth,
    padding,
    phoneColumns,
    width,
  ]);
}

export function contentShellStyle(maxWidth: number, padding = 20): ViewStyle {
  return {
    width: '100%',
    maxWidth,
    alignSelf: 'center',
    paddingHorizontal: padding,
  };
}

/** ScrollView / FlatList contentContainerStyle that stays readable on every size. */
export function useCenteredContentStyle(options?: {
  width?: ContentWidth;
  padding?: number;
  paddingTop?: number;
  paddingBottom?: number;
  phonePadding?: number;
}) {
  const { isTablet, horizontalPadding, deviceSize } = useResponsiveLayout();
  const widthKey = options?.width ?? 'page';
  const pad =
    options?.padding ??
    (isTablet ? horizontalPadding : options?.phonePadding ?? horizontalPadding);
  const maxW = maxWidthForSize(deviceSize, widthKey);

  return useMemo(
    () => ({
      paddingHorizontal: pad,
      ...(options?.paddingTop != null ? { paddingTop: options.paddingTop } : null),
      ...(options?.paddingBottom != null ? { paddingBottom: options.paddingBottom } : null),
      alignSelf: 'center' as const,
      width: '100%' as const,
      ...(maxW != null ? { maxWidth: maxW } : null),
    }),
    [maxW, options?.paddingBottom, options?.paddingTop, pad],
  );
}

/** Centered bottom bar / nav inset for tablets so chrome matches content width. */
export function useBottomChromeInset(maxWidth: number = CONTENT_MAX.wide) {
  const { width, isTablet } = useResponsiveLayout();
  return useMemo(() => {
    if (!isTablet) {
      return { left: 0, right: 0 };
    }
    const inset = Math.max(0, (width - Math.min(width, maxWidth)) / 2);
    return { left: inset, right: inset };
  }, [isTablet, maxWidth, width]);
}
