import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import { StackScreenHeader } from '../components/StackScreenHeader';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeMode } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Appearance'>;

const OPTIONS: {
  id: ThemeMode;
  title: string;
  subtitle: string;
  icon: string;
  preview: {
    bg: string;
    card: string;
    accent: string;
    text: string;
    muted: string;
  };
}[] = [
  {
    id: 'light',
    title: 'Light',
    subtitle: 'Bright & clean for daytime shopping',
    icon: 'sunny-outline',
    preview: {
      bg: '#F4F7F5',
      card: '#FFFFFF',
      accent: '#0A5C3E',
      text: '#0F172A',
      muted: '#94A3B8',
    },
  },
  {
    id: 'dark',
    title: 'Dark',
    subtitle: 'Easy on the eyes at night',
    icon: 'moon-outline',
    preview: {
      bg: '#040C12',
      card: '#0D1818',
      accent: '#A8F238',
      text: '#F7FAF8',
      muted: '#94A6A3',
    },
  },
];

export function AppearanceScreen() {
  const navigation = useNavigation<Nav>();
  const { theme, colors, setTheme, isDark } = useTheme();
  const { shellStyle } = useResponsiveLayout();

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <StackScreenHeader title="Appearance" onBack={() => navigation.goBack()} shell="wide" />

      <View style={[styles.content, shellStyle('wide')]}>
        <Text style={[styles.lead, { color: colors.textSecondary }]}>
          Choose how G-Fresh looks. Your preference is saved on this device.
        </Text>

        <View style={styles.options}>
          {OPTIONS.map(option => {
            const selected = theme === option.id;
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                  selected && styles.optionCardSelected,
                ]}
                onPress={() => setTheme(option.id)}>
                <View
                  style={[
                    styles.preview,
                    {
                      backgroundColor: option.preview.bg,
                      borderColor: colors.border,
                    },
                  ]}>
                  <View style={[styles.previewHeader, { backgroundColor: option.preview.card }]}>
                    <View style={[styles.previewDot, { backgroundColor: option.preview.accent }]} />
                    <View style={[styles.previewLine, { backgroundColor: option.preview.muted }]} />
                  </View>
                  <View style={[styles.previewBody, { backgroundColor: option.preview.card }]}>
                    <View style={[styles.previewBlock, { backgroundColor: option.preview.accent }]} />
                    <View style={styles.previewLines}>
                      <View
                        style={[styles.previewLineWide, { backgroundColor: option.preview.text }]}
                      />
                      <View
                        style={[styles.previewLineMid, { backgroundColor: option.preview.muted }]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.optionMeta}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: selected
                          ? isDark
                            ? 'rgba(168, 242, 56, 0.14)'
                            : '#ECFDF3'
                          : colors.search,
                      },
                    ]}>
                    <Icon
                      color={selected ? colors.primary : colors.textSecondary}
                      name={option.icon}
                      size={20}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                      {option.subtitle}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.accent : 'transparent',
                      },
                    ]}>
                    {selected ? (
                      <Icon color={isDark ? '#040C12' : colors.primaryDark} name="checkmark" size={14} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  options: {
    gap: 14,
  },
  optionCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 14,
  },
  optionCardSelected: {
    borderWidth: 2,
  },
  preview: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
  },
  previewHeader: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  previewDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  previewLine: {
    borderRadius: 999,
    flex: 1,
    height: 6,
    opacity: 0.55,
  },
  previewBody: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  previewBlock: {
    borderRadius: 10,
    height: 36,
    width: 36,
  },
  previewLines: {
    flex: 1,
    gap: 6,
  },
  previewLineWide: {
    borderRadius: 999,
    height: 7,
    opacity: 0.9,
    width: '70%',
  },
  previewLineMid: {
    borderRadius: 999,
    height: 6,
    opacity: 0.7,
    width: '48%',
  },
  optionMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  optionText: {
    flex: 1,
    marginHorizontal: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  optionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  check: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
