import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ContentWidth, useResponsiveLayout } from '../utils/layout';

type Props = {
  children: ReactNode;
  /** Caps content width on tablet / iPad. Default `page`. */
  width?: ContentWidth;
  /** Extra horizontal padding override. */
  padding?: number;
  style?: ViewStyle;
  className?: string;
};

/**
 * Centers content with device-aware padding and max width so pages
 * look correct on compact phones through large iPads.
 */
export function ScreenContainer({
  children,
  width = 'page',
  padding,
  style,
  className,
}: Props) {
  const { shellStyle } = useResponsiveLayout();
  const base = shellStyle(width);

  return (
    <View
      className={className}
      style={[
        styles.shell,
        base,
        padding != null ? { paddingHorizontal: padding } : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    width: '100%',
  },
});
