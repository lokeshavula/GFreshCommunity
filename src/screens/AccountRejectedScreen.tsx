import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useEffect, useState } from 'react';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { getCurrentUser, signOut } from '../services/userService';
import { GfmUser } from '../types/gfm';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AccountRejected'>;

export function AccountRejectedScreen() {
  const navigation = useNavigation<Nav>();
  const { formMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [user, setUser] = useState<GfmUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigation.replace('Login');
  };

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.inner, { maxWidth: formMaxWidth }]}>
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Icon color="#B91C1C" name="close-circle-outline" size={52} />
              </View>
              <Text style={styles.title}>Registration not approved</Text>
              <Text style={styles.message}>
                Your registration could not be approved at this time. Please contact community
                support if you believe this is an error.
              </Text>

              {user?.rejectionReason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Reason</Text>
                  <Text style={styles.reasonText}>{user.rejectionReason}</Text>
                </View>
              ) : null}

              <View style={styles.details}>
                <Text style={styles.detailLine}>
                  {user?.fullName ?? 'Resident'} · {user?.mobileNumber ?? '—'}
                </Text>
                <Text style={styles.detailLine}>
                  {user?.communityName ?? 'Community'} · Tower {user?.tower ?? user?.blockNumber}{' '}
                  · Flat {user?.flatNo}
                </Text>
              </View>

              <Pressable style={styles.supportBtn} onPress={() => navigation.navigate('HelpSupport')}>
                <Icon color={colors.white} name="headset-outline" size={18} />
                <Text style={styles.supportBtnText}>Contact support</Text>
              </Pressable>

              <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
    paddingTop: 24,
  },
  inner: {
    width: '100%',
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#FECACA',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 999,
    height: 88,
    justifyContent: 'center',
    marginBottom: 18,
    width: 88,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  reasonBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    marginTop: 18,
    padding: 14,
    width: '100%',
  },
  reasonLabel: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reasonText: {
    color: '#7F1D1D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  details: {
    marginTop: 18,
    width: '100%',
  },
  detailLine: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  supportBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    width: '100%',
  },
  supportBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 14,
    paddingVertical: 10,
  },
  logoutBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
