import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchGfmUser, getCurrentUser, signOut } from '../../services/userService';
import { resolveHouseholdIdForUser } from '../../services/householdService';
import {
  ensureHouseholdMemberForUser,
  fetchHouseholdMembers,
} from '../../services/householdMemberService';
import { GfmHouseholdMember, GfmUser } from '../../types/gfm';
import { LegalInfoType } from '../../navigation/AppNavigator';
import { AppStatusBar } from '../AppStatusBar';
import { ProfilePhotoViewer } from '../ProfilePhotoViewer';
import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type SettingItem = {
  id: string;
  label: string;
  icon: string;
  subtitle?: string;
  showChevron?: boolean;
  onPress?: () => void;
};

export type AccountDestination =
  | { screen: 'OrderHistory' }
  | { screen: 'RfIdCard' }
  | { screen: 'EditProfile' }
  | { screen: 'DeliveryAddress' }
  | { screen: 'Household' }
  | { screen: 'PaymentMethods' }
  | { screen: 'Security' }
  | { screen: 'HelpSupport' }
  | { screen: 'Notifications' }
  | { screen: 'LegalInfo'; type: LegalInfoType };

type Props = {
  bottomPadding?: number;
  onSignIn: () => void;
  onLogout: () => void;
  onOpenPage?: (destination: AccountDestination) => void;
};

export function AccountTabContent({
  bottomPadding = 120,
  onSignIn,
  onLogout,
  onOpenPage,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet, pageMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [user, setUser] = useState<GfmUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [householdError, setHouseholdError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [members, setMembers] = useState<GfmHouseholdMember[]>([]);

  const loadUser = useCallback(async () => {
    const cached = await getCurrentUser();
    if (!cached) {
      setUser(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setUser(cached);
    setIsLoading(false);
    setHouseholdError(false);

    const fresh = await fetchGfmUser(cached.id);
    if (!fresh) {
      return;
    }

    let resolvedId = fresh.householdId ?? fresh.household?.id ?? null;
    if (!resolvedId) {
      resolvedId = await resolveHouseholdIdForUser(fresh);
    }

    let nextUser = fresh;
    if (resolvedId && !fresh.householdId) {
      const refreshed = await fetchGfmUser(fresh.id);
      if (refreshed) {
        nextUser = refreshed;
      }
    }

    if (resolvedId && nextUser.accountStatus === 'ACTIVE') {
      try {
        await ensureHouseholdMemberForUser(nextUser, resolvedId);
      } catch {
        // members table may not exist yet
      }
    }

    setUser(nextUser);

    if (resolvedId) {
      try {
        const nextMembers = await fetchHouseholdMembers(resolvedId);
        setMembers(nextMembers);
      } catch {
        setMembers([]);
      }
    } else {
      setMembers([]);
    }

    if (resolvedId && !nextUser.household) {
      setHouseholdError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  const requireUser = (destination: AccountDestination) => {
    if (!user) {
      onSignIn();
      return;
    }
    onOpenPage?.(destination);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          setUser(null);
          onLogout();
        },
      },
    ]);
  };

  const accountSettings: SettingItem[] = [
    {
      id: 'orders',
      label: 'Order History',
      icon: 'receipt-outline',
      subtitle: 'View your past orders',
      showChevron: true,
      onPress: () => requireUser({ screen: 'OrderHistory' }),
    },
    {
      id: 'address',
      label: 'Delivery Address',
      icon: 'location-outline',
      subtitle: user ? `Block ${user.blockNumber}, Flat ${user.flatNo}` : 'Not set',
      showChevron: true,
      onPress: () => requireUser({ screen: 'DeliveryAddress' }),
    },
    {
      id: 'payment',
      label: 'Payment Methods',
      icon: 'card-outline',
      subtitle: 'Manage payment options',
      showChevron: true,
      onPress: () => requireUser({ screen: 'PaymentMethods' }),
    },
    {
      id: 'rfid',
      label: 'RF ID Card',
      icon: 'radio-outline',
      subtitle: 'Balance, spend & recharge',
      showChevron: true,
      onPress: () => requireUser({ screen: 'RfIdCard' }),
    },
    {
      id: 'security',
      label: 'Security',
      icon: 'lock-closed-outline',
      subtitle: 'Password & account protection',
      showChevron: true,
      onPress: () => requireUser({ screen: 'Security' }),
    },
  ];

  const appSettings: SettingItem[] = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications-outline',
      subtitle: 'Order updates, offers & alerts',
      showChevron: true,
      onPress: () => onOpenPage?.({ screen: 'Notifications' }),
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'headset-outline',
      showChevron: true,
      onPress: () => onOpenPage?.({ screen: 'HelpSupport' }),
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      showChevron: true,
      onPress: () => onOpenPage?.({ screen: 'LegalInfo', type: 'privacy' }),
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      icon: 'document-text-outline',
      showChevron: true,
      onPress: () => onOpenPage?.({ screen: 'LegalInfo', type: 'terms' }),
    },
    {
      id: 'about',
      label: 'About LG Enterprises',
      icon: 'information-circle-outline',
      subtitle: 'Version 1.0.0',
      showChevron: true,
      onPress: () => onOpenPage?.({ screen: 'LegalInfo', type: 'about' }),
    },
  ];

  if (isLoading) {
    return (
      <View
        className="flex-1 bg-slate-50 items-center justify-center"
        style={{ paddingBottom: bottomPadding / 2 }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text className="mt-3 text-sm text-slate-500">Loading account…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <AppStatusBar />
      <View style={{ height: insets.top, backgroundColor: colors.surface }} />
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomPadding,
            paddingHorizontal: horizontalPadding,
          },
          isTablet && [
            styles.tabletScrollContent,
            {
              maxWidth: pageMaxWidth,
            },
          ],
        ]}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        overScrollMode="never"
        showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-gray-900 mb-5">Account</Text>

        <ProfilePhotoViewer
          name={user?.fullName}
          uri={user?.avatarUrl ?? null}
          visible={viewerOpen}
          onChangePhoto={() => {
            setViewerOpen(false);
            requireUser({ screen: 'EditProfile' });
          }}
          onClose={() => setViewerOpen(false)}
        />

        <View className="bg-white rounded-3xl p-5 mb-5" style={styles.card}>
          <View className="flex-row items-center">
            <Pressable
              accessibilityLabel={user?.avatarUrl ? 'View profile photo' : 'Add profile photo'}
              style={styles.avatarPressable}
              onPress={() => {
                if (!user) {
                  onSignIn();
                  return;
                }
                if (user.avatarUrl) {
                  setViewerOpen(true);
                  return;
                }
                requireUser({ screen: 'EditProfile' });
              }}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center">
                  <Text className="text-2xl font-bold text-green-700">
                    {user?.fullName?.charAt(0)?.toUpperCase() ?? 'G'}
                  </Text>
                </View>
              )}
              {user ? (
                <Pressable
                  accessibilityLabel="Edit profile photo"
                  style={styles.avatarEditBadge}
                  hitSlop={6}
                  onPress={() => requireUser({ screen: 'EditProfile' })}>
                  <Icon color={colors.white} name="camera" size={11} />
                </Pressable>
              ) : null}
            </Pressable>
            <View className="flex-1 ml-4">
              <View className="flex-row items-center">
                <Text className="flex-1 text-xl font-bold text-gray-900" numberOfLines={1}>
                  {user?.fullName ?? 'Guest User'}
                </Text>
                {user ? (
                  <Pressable
                    accessibilityLabel="Edit profile"
                    className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                    hitSlop={8}
                    onPress={() => requireUser({ screen: 'EditProfile' })}>
                    <Icon color={colors.primary} name="create-outline" size={18} />
                  </Pressable>
                ) : null}
              </View>
              <Text className="text-sm text-gray-500 mt-1">
                {user?.mobileNumber ?? 'Sign in to view profile'}
              </Text>
              {user ? (
                <Text className="text-xs text-gray-400 mt-1">
                  {user.household
                    ? `${user.household.flatNumber} · Tower ${user.household.tower}`
                    : `Block ${user.blockNumber} · Flat ${user.flatNo}`}
                </Text>
              ) : null}
            </View>
          </View>

          {user ? (
            <Pressable
              style={styles.householdCard}
              onPress={() => requireUser({ screen: 'Household' })}>
              <View style={styles.householdIcon}>
                <Icon color={colors.primary} name="home-outline" size={18} />
              </View>
              <View style={styles.householdBody}>
                <Text style={styles.householdTitle}>My Household</Text>
                <Text style={styles.householdSub} numberOfLines={1}>
                  {user.household
                    ? `${user.household.flatNumber} · Tower ${user.household.tower}${members.length > 0 ? ` · ${members.length} members` : ''
                    }`
                    : user.accountStatus === 'PENDING_APPROVAL' ||
                      user.accountStatus === 'REGISTERED'
                      ? 'Pending approval'
                      : householdError
                        ? 'Tap to retry'
                        : `Tower ${user.tower ?? user.blockNumber} · Flat ${user.flatNo}`}
                </Text>
              </View>
              <Icon color="#94A3B8" name="chevron-forward" size={16} />
            </Pressable>
          ) : null}

          {!user ? (
            <Pressable
              className="mt-5 bg-green-500 rounded-2xl py-3.5 items-center"
              onPress={onSignIn}
            >
              <Text className="text-white font-semibold">Sign In</Text>
            </Pressable>
          ) : null}
        </View>

        <SettingsSection title="Account">
          {accountSettings.map(item => (
            <SettingRow key={item.id} item={item} />
          ))}
        </SettingsSection>

        <SettingsSection title="More">
          {appSettings.map(item => (
            <SettingRow key={item.id} item={item} />
          ))}
        </SettingsSection>

        {user ? (
          <Pressable
            className="mt-2 bg-white rounded-2xl py-4 flex-row items-center justify-center gap-2"
            style={styles.card}
            onPress={handleLogout}
          >
            <Icon name="log-out-outline" size={20} color={colors.danger} />
            <Text className="text-base font-semibold text-red-500">Logout</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
        {title}
      </Text>
      {children}
    </View>
  );
}

function SettingRow({ item }: { item: SettingItem }) {
  return (
    <Pressable
      className="bg-white rounded-2xl px-4 py-4 flex-row items-center mb-2"
      style={styles.card}
      onPress={item.onPress}
    >
      <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center">
        <Icon name={item.icon} size={20} color={colors.primary} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-base font-medium text-gray-900">{item.label}</Text>
        {item.subtitle ? (
          <Text className="text-xs text-gray-500 mt-0.5">{item.subtitle}</Text>
        ) : null}
      </View>
      {item.showChevron ? (
        <Icon name="chevron-forward" size={18} color="#9CA3AF" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
  },
  tabletScrollContent: {
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarImage: {
    borderRadius: 32,
    height: 64,
    width: 64,
  },
  avatarPressable: {
    height: 64,
    position: 'relative',
    width: 64,
  },
  avatarEditBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    bottom: -1,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -1,
    width: 22,
  },
  householdCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  householdIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  householdBody: {
    flex: 1,
    marginHorizontal: 10,
  },
  householdTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  householdSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
});
