import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { HouseholdMembersCard } from '../components/household/HouseholdMembersCard';
import { RootStackParamList } from '../navigation/AppNavigator';
import { prepareUserHouseholdContext } from '../services/householdMemberService';
import { formatHouseholdLabelFromUser } from '../services/householdService';
import { fetchGfmUser, getCurrentUser } from '../services/userService';
import { GfmUser } from '../types/gfm';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Household'>;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="mt-1 text-base font-medium text-slate-900">{value}</Text>
    </View>
  );
}

export function HouseholdScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingBottom: insets.bottom + 28,
  });
  const [user, setUser] = useState<GfmUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [canManageMembers, setCanManageMembers] = useState(false);

  const loadUser = useCallback(async () => {
    setLoadError(false);
    const cached = await getCurrentUser();
    if (!cached) {
      navigation.replace('Login');
      return;
    }

    setUser(cached);

    const fresh = await fetchGfmUser(cached.id);
    const base = fresh ?? cached;
    const context = await prepareUserHouseholdContext(base, fetchGfmUser);

    setUser(context.user);
    setHouseholdId(context.householdId);
    setCanManageMembers(context.canManageMembers);

    if (context.householdId && !context.user.household) {
      setLoadError(true);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadUser().finally(() => setLoading(false));
    }, [loadUser]),
  );

  const householdLabel = formatHouseholdLabelFromUser(user);
  const tower = user?.household?.tower ?? user?.tower ?? user?.blockNumber ?? '—';
  const flat = user?.household?.flatNumber ?? user?.flatNo ?? '—';
  const isPending = user?.accountStatus === 'PENDING_APPROVAL' || user?.accountStatus === 'REGISTERED';
  const isPrimary = Boolean(user?.household && user.household.primaryUserId === user.id);

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Your registered community address"
        title="My Household"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}>
          {isPending ? (
            <View style={styles.noticeCard}>
              <Icon color="#B45309" name="time-outline" size={22} />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-amber-900">Awaiting admin approval</Text>
                <Text className="mt-1 text-sm text-amber-800">
                  Your household will be linked automatically once the community admin approves your
                  account.
                </Text>
              </View>
            </View>
          ) : null}

          {user?.household ? (
            <View style={styles.card}>
              <View className="mb-4 flex-row items-center">
                <View style={styles.iconWrap}>
                  <Icon color={colors.primary} name="home" size={22} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-lg font-bold text-slate-900">{householdLabel ?? flat}</Text>
                  <Text className="mt-0.5 text-sm text-slate-500">
                    {user.household.communityName ?? user.communityName ?? 'Community'}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{user.household.status}</Text>
                </View>
              </View>

              <InfoRow label="Tower / Block" value={user.household.tower} />
              <InfoRow label="Flat number" value={user.household.flatNumber} />
              <InfoRow
                label="Community"
                value={user.household.communityName ?? user.communityName ?? '—'}
              />
              {isPrimary ? (
                <View style={styles.primaryBadge}>
                  <Icon color={colors.primary} name="star" size={14} />
                  <Text className="ml-1.5 text-xs font-bold text-primary">Primary resident</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}>
              <View className="mb-4 flex-row items-center">
                <View style={styles.iconWrap}>
                  <Icon color={colors.primary} name="home-outline" size={22} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-lg font-bold text-slate-900">Registered address</Text>
                  <Text className="mt-0.5 text-sm text-slate-500">
                    {user?.communityName ?? 'Your community'}
                  </Text>
                </View>
              </View>

              <InfoRow label="Tower / Block" value={tower} />
              <InfoRow label="Flat number" value={flat} />
              <InfoRow label="Community" value={user?.communityName ?? '—'} />

              {loadError ? (
                <View style={styles.errorBox}>
                  <Text className="text-sm text-slate-600">
                    We couldn't load your linked household. Try again or contact your community admin.
                  </Text>
                  <Pressable style={styles.retryBtn} onPress={loadUser}>
                    <Text className="text-sm font-bold text-primary">Retry</Text>
                  </Pressable>
                </View>
              ) : !isPending ? (
                <Text className="mt-4 text-sm text-slate-500">
                  If your household is missing, ask your community admin to review your account in the
                  admin panel.
                </Text>
              ) : null}
            </View>
          )}

          {householdId ? (
            <HouseholdMembersCard
              actorUserId={user?.id}
              canManage={canManageMembers}
              householdId={householdId}
              onChanged={loadUser}
            />
          ) : !isPending ? (
            <View style={styles.card}>
              <Text className="text-sm font-bold text-slate-800">Family members</Text>
              <Text className="mt-2 text-sm text-slate-500">
                Household not linked yet. Make sure you ran gfm_households.sql and
                gfm_household_members.sql in Supabase, then pull to refresh or reopen this screen.
                You do not need a new account if yours is already ACTIVE.
              </Text>
              <Pressable style={styles.retryBtn} onPress={loadUser}>
                <Text className="text-sm font-bold text-primary">Retry link household</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.helpCard}>
            <Text className="text-sm font-bold text-slate-800">How households work</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              Primary residents can add family by mobile (registered users) or create child profiles
              without login. Adults can order; child profiles are view-only unless changed by admin.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  noticeCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 14,
  },
  helpCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  row: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 12,
  },
  statusPill: {
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  primaryBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  errorBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
});
