import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type HomeHeaderProps = {
  topInset: number;
  userName: string;
  avatarUrl?: string | null;
  householdLabel?: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenNotifications?: () => void;
  onOpenFavourites?: () => void;
};

export function HomeHeader({
  topInset,
  userName,
  avatarUrl,
  householdLabel,
  searchQuery,
  onSearchChange,
  onOpenNotifications,
  onOpenFavourites,
}: HomeHeaderProps) {
  const { shellStyle, isCompact, scale } = useResponsiveLayout();
  const titleSize = Math.round((isCompact ? 22 : 26) * scale);

  return (
    <View>
      <View pointerEvents="none" style={styles.overscrollFill} />

      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View pointerEvents="none" style={styles.glowOne} />
        <View pointerEvents="none" style={styles.glowTwo} />

        <View style={[shellStyle('wide'), styles.headerBlock]}>
          <View className="flex-row items-center justify-between pb-3">
            <View className="flex-row items-center flex-1 pr-2">
              <View style={styles.avatarRing}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {(userName ?? 'Guest').trim().charAt(0).toUpperCase() || 'G'}
                    </Text>
                  </View>
                )}
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Icon color={colors.accent} name="location-sharp" size={14} />
                  <Text className="ml-1 text-xs font-semibold text-accent">
                    {householdLabel ? 'Your household' : 'Deliver to'}
                  </Text>
                </View>
                <Text className="text-base font-bold text-white" numberOfLines={1}>
                  {householdLabel ?? 'Home · Hyderabad'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityLabel="Favourites"
                style={styles.iconButton}
                onPress={() => onOpenFavourites?.()}>
                <Icon color={colors.danger} name="heart" size={20} />
              </Pressable>

              <Pressable
                accessibilityLabel="Notifications"
                style={styles.iconButton}
                onPress={() => onOpenNotifications?.()}>
                <Icon color={colors.textPrimary} name="notifications-outline" size={22} />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>
          </View>

          <View className="pb-2">
            <Text className="text-sm text-white/70">Good morning 👋</Text>
            <Text
              className="font-bold text-white leading-8"
              style={{ fontSize: titleSize }}
              numberOfLines={1}>
              {userName ?? 'Guest'}
            </Text>
            {householdLabel ? (
              <Text className="mt-1 text-sm font-semibold text-white/80" numberOfLines={1}>
                {householdLabel}
              </Text>
            ) : null}
          </View>

          <View className="pb-6">
            <View style={styles.searchBar}>
              <Icon color={colors.primaryLight} name="search-outline" size={20} />
              <TextInput
                className="ml-3 flex-1 text-base text-slate-800"
                placeholder="Search fruits, snacks, dairy..."
                placeholderTextColor="#94A3B8"
                returnKeyType="search"
                value={searchQuery}
                onChangeText={onSearchChange}
              />
              {searchQuery.length > 0 ? (
                <Pressable hitSlop={8} onPress={() => onSearchChange('')}>
                  <Icon color="#94A3B8" name="close-circle" size={20} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overscrollFill: {
    backgroundColor: colors.primaryDark,
    height: 320,
    marginBottom: -320,
  },
  header: {
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlock: {
    paddingTop: 0,
  },
  glowOne: {
    backgroundColor: 'rgba(184, 240, 74, 0.12)',
    borderRadius: 999,
    height: 140,
    position: 'absolute',
    right: -30,
    top: -20,
    width: 140,
  },
  glowTwo: {
    backgroundColor: 'rgba(26, 143, 92, 0.25)',
    borderRadius: 999,
    height: 90,
    left: -20,
    position: 'absolute',
    top: 40,
    width: 90,
  },
  avatarRing: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    padding: 2,
  },
  avatar: {
    borderRadius: 999,
    height: 48,
    width: 48,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarInitial: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '700',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  notificationDot: {
    backgroundColor: colors.danger,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 10,
    top: 10,
    width: 10,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
});
