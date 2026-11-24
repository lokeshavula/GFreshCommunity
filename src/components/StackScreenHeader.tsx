import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppStatusBar } from './AppStatusBar';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Props = {
  title: string;
  onBack: () => void;
  right?: ReactNode;
  /** When true, title is centered between back and a matching right spacer */
  centered?: boolean;
  shell?: 'page' | 'wide';
};

/**
 * Shared stack header: status bar (signal/time) on top, back + title below — Blinkit style.
 */
export function StackScreenHeader({
  title,
  onBack,
  right,
  centered = true,
  shell = 'page',
}: Props) {
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();

  return (
    <View style={styles.wrap}>
      <AppStatusBar />
      {/* Transparent status inset — signal / time / battery stay visible */}
      <View style={{ height: insets.top, backgroundColor: colors.white }} />
      <View style={[styles.bar, shellStyle(shell)]}>
        <Pressable
          accessibilityLabel="Go back"
          hitSlop={8}
          style={styles.backButton}
          onPress={onBack}>
          <Icon color={colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        {centered ? (
          <>
            <View style={styles.centerTitle}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {right ?? <View style={styles.sideSpacer} />}
          </>
        ) : (
          <>
            <View style={styles.leftTitle}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {right}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 8,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  centerTitle: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  leftTitle: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  sideSpacer: {
    height: 40,
    width: 40,
  },
});
