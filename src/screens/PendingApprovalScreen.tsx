import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { getCurrentUser, refreshUserFromServer, signOut } from '../services/userService';
import { GfmUser } from '../types/gfm';
import { colors } from '../theme/colors';
import { getRouteForUser, isAccountActive } from '../utils/authGuard';
import { useResponsiveLayout } from '../utils/layout';

const LOGO = require('../../assests/lg-enterprises-logo.png');

type Nav = NativeStackNavigationProp<RootStackParamList, 'PendingApproval'>;

const STEPS = [
  { id: 'submitted', label: 'Registration submitted', icon: 'checkmark-circle' },
  { id: 'review', label: 'Community admin review', icon: 'time-outline' },
  { id: 'access', label: 'Access granted', icon: 'lock-open-outline' },
];

export function PendingApprovalScreen() {
  const navigation = useNavigation<Nav>();
  const { formMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [user, setUser] = useState<GfmUser | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [justApproved, setJustApproved] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStatus = useCallback(async (showLoader = false) => {
    if (showLoader) setIsRefreshing(true);
    try {
      const current = await getCurrentUser();
      if (!current) {
        navigation.replace('Login');
        return;
      }

      const fresh = await refreshUserFromServer(current.id);
      if (!fresh) return;

      setUser(fresh);

      if (isAccountActive(fresh.accountStatus)) {
        setJustApproved(true);
        setTimeout(() => {
          navigation.replace(getRouteForUser(fresh));
        }, 1800);
        return;
      }

      const nextRoute = getRouteForUser(fresh);
      if (nextRoute !== 'PendingApproval') {
        navigation.replace(nextRoute);
      }
    } finally {
      if (showLoader) setIsRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      refreshStatus(true);
    }, [refreshStatus]),
  );

  useEffect(() => {
    pollRef.current = setInterval(() => refreshStatus(false), 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshStatus]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshStatus(false);
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [refreshStatus]);

  const handleLogout = async () => {
    await signOut();
    navigation.replace('Login');
  };

  const tower = user?.tower ?? user?.blockNumber ?? '—';
  const flat = user?.flatNo ?? '—';
  const community = user?.communityName ?? 'Your community';

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.inner, { maxWidth: formMaxWidth }]}>
            <View style={styles.hero}>
              <View style={styles.heroOrb} />
              <View style={styles.logoWrap}>
                <Image resizeMode="contain" source={LOGO} style={styles.logo} />
              </View>
              <Text style={styles.heroTitle}>G Fresh Mart</Text>
              <Text style={styles.heroSubtitle}>Community supermarket</Text>
            </View>

            {justApproved ? (
              <View style={styles.approvedCard}>
                <View style={styles.approvedIcon}>
                  <Icon color={colors.primary} name="checkmark-circle" size={48} />
                </View>
                <Text style={styles.approvedTitle}>🎉 Your account has been approved!</Text>
                <Text style={styles.approvedMessage}>
                  Welcome to G Fresh Mart. Opening the store for you…
                </Text>
                <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
              </View>
            ) : (
              <>
                <View style={styles.statusCard}>
                  <View style={styles.statusHeader}>
                    <View style={styles.statusIconWrap}>
                      <Icon color="#C2410C" name="hourglass-outline" size={28} />
                    </View>
                    <View className="flex-1">
                      <Text style={styles.statusEyebrow}>Account status</Text>
                      <Text style={styles.statusTitle}>Awaiting approval</Text>
                    </View>
                    {isRefreshing ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <Pressable hitSlop={8} onPress={() => refreshStatus(true)}>
                        <Icon color={colors.primary} name="refresh-outline" size={22} />
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.statusBody}>
                    Your registration has been submitted successfully. Our community admin will
                    verify your details. You will be notified once your account is approved.
                  </Text>
                </View>

                <View style={styles.stepsCard}>
                  {STEPS.map((step, index) => {
                    const done = index === 0;
                    const active = index === 1;
                    return (
                      <View key={step.id} style={styles.stepRow}>
                        <View
                          style={[
                            styles.stepDot,
                            done && styles.stepDotDone,
                            active && styles.stepDotActive,
                          ]}>
                          <Icon
                            color={done ? colors.white : active ? colors.primary : '#94A3B8'}
                            name={step.icon}
                            size={16}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            style={[
                              styles.stepLabel,
                              (done || active) && styles.stepLabelActive,
                            ]}>
                            {step.label}
                          </Text>
                          {active ? (
                            <Text style={styles.stepHint}>Usually within 24 hours</Text>
                          ) : null}
                        </View>
                        {index < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.detailsCard}>
                  <Text style={styles.detailsTitle}>Registration details</Text>
                  <DetailRow icon="person-outline" label="Name" value={user?.fullName ?? '—'} />
                  <DetailRow
                    icon="call-outline"
                    label="Mobile"
                    value={user?.mobileNumber ?? '—'}
                  />
                  {user?.email ? (
                    <DetailRow icon="mail-outline" label="Email" value={user.email} />
                  ) : null}
                  <DetailRow icon="business-outline" label="Community" value={community} />
                  <DetailRow icon="layers-outline" label="Tower / Block" value={tower} />
                  <DetailRow icon="home-outline" label="Flat number" value={flat} />
                </View>

                <View style={styles.infoBanner}>
                  <Icon color={colors.primary} name="information-circle-outline" size={20} />
                  <Text style={styles.infoText}>
                    Shopping, cart, and orders will unlock automatically after approval.
                  </Text>
                </View>
              </>
            )}

            {!justApproved ? (
              <View style={styles.actions}>
                <Pressable style={styles.secondaryBtn} onPress={() => refreshStatus(true)}>
                  <Icon color={colors.primary} name="refresh-outline" size={18} />
                  <Text style={styles.secondaryBtnText}>Check status</Text>
                </Pressable>
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                  <Icon color="#64748B" name="log-out-outline" size={18} />
                  <Text style={styles.logoutBtnText}>Sign out</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon color={colors.primary} name={icon} size={16} />
      </View>
      <View className="flex-1">
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 8,
  },
  inner: {
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 28,
    marginBottom: 20,
    overflow: 'hidden',
    paddingBottom: 28,
    paddingTop: 24,
    position: 'relative',
  },
  heroOrb: {
    backgroundColor: 'rgba(184, 240, 74, 0.12)',
    borderRadius: 999,
    height: 120,
    position: 'absolute',
    right: -20,
    top: -20,
    width: 120,
  },
  logoWrap: {
    backgroundColor: colors.white,
    borderRadius: 18,
    height: 64,
    overflow: 'hidden',
    padding: 6,
    width: 64,
  },
  logo: {
    height: '100%',
    width: '100%',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    marginBottom: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statusIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  statusEyebrow: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  statusBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  stepsCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    position: 'relative',
  },
  stepDot: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  stepDotActive: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderWidth: 2,
  },
  stepLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  stepLabelActive: {
    color: colors.textPrimary,
  },
  stepHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  stepLine: {
    backgroundColor: '#E2E8F0',
    bottom: -8,
    height: 12,
    left: 17,
    position: 'absolute',
    top: 36,
    width: 2,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  detailsTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  infoBanner: {
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    padding: 14,
  },
  infoText: {
    color: '#166534',
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  approvedCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#BBF7D0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
  },
  approvedIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    height: 80,
    justifyContent: 'center',
    marginBottom: 16,
    width: 80,
  },
  approvedTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  approvedMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
