import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useEffect, useState } from 'react';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { getCurrentUser, signOut } from '../services/userService';
import { AccountStatus, GfmUser } from '../types/gfm';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AccountSuspended'>;

function statusLabel(status: AccountStatus | undefined): string {
  if (status === 'BLOCKED') return 'Access blocked';
  if (status === 'DEACTIVATED') return 'Account deactivated';
  return 'Account suspended';
}

export function AccountSuspendedScreen() {
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
                <Icon color="#92400E" name="shield-outline" size={52} />
              </View>
              <Text style={styles.title}>{statusLabel(user?.accountStatus)}</Text>
              <Text style={styles.message}>
                Your account access has been restricted. Please contact the community admin for
                assistance.
              </Text>

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
    borderColor: '#FDE68A',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
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
