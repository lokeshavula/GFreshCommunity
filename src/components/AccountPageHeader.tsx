import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppStatusBar } from './AppStatusBar';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
};

/**
 * Blinkit-style page header:
 * - Status bar (signal / time / battery) stays visible on top
 * - Back + title sit below the safe area
 */
export function AccountPageHeader({ title, subtitle, onBack, right }: Props) {
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();

  return (
    <View style={styles.wrap}>
      <AppStatusBar />
      {/* Transparent status zone — system icons show clearly */}
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />
      <View style={[styles.headerBar, shellStyle('page')]}>
        <Pressable
          accessibilityLabel="Go back"
          hitSlop={8}
          style={styles.backButton}
          onPress={onBack}>
          <Icon color={colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  titleBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  right: {
    marginLeft: 4,
  },
});
