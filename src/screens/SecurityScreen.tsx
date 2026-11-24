import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getCurrentUser, updatePassword } from '../services/userService';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Security'>;

export function SecurityScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingBottom: insets.bottom + 28,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [appLock, setAppLock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const user = await getCurrentUser();
        if (!user) {
          navigation.replace('Login');
          return;
        }
        setUserId(user.id);
        setMobile(user.mobileNumber);
        setLoading(false);
      })();
    }, [navigation]),
  );

  const handleUpdatePassword = async () => {
    if (!userId) {
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password must match.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(userId, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your account password has been changed.');
    } catch (error) {
      Alert.alert('Update failed', getErrorMessage(error, 'Could not update password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Protect your G-Fresh account"
        title="Security"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={[{ paddingTop: 20 }, contentStyle]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Icon color={colors.primaryDark} name="shield-checkmark" size={22} />
            </View>
            <Text className="mt-3 text-base font-bold text-slate-900">Account protection</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Signed in with {mobile}. Keep your password private and enable alerts for safer access.
            </Text>
          </View>

          <Text className="mb-3 text-sm font-bold text-slate-900">Change password</Text>
          <View style={styles.formCard}>
            <PasswordField
              label="Current password"
              show={showPasswords}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <PasswordField
              label="New password"
              show={showPasswords}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <PasswordField
              label="Confirm new password"
              show={showPasswords}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              last
            />
            <Pressable
              className="mt-2 flex-row items-center"
              onPress={() => setShowPasswords(current => !current)}>
              <Icon
                color={colors.primary}
                name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
                size={16}
              />
              <Text className="ml-2 text-sm font-semibold text-primary">
                {showPasswords ? 'Hide passwords' : 'Show passwords'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveDisabled]}
            onPress={handleUpdatePassword}>
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-sm font-bold text-white">Update password</Text>
            )}
          </Pressable>

          <Text className="mb-3 mt-5 text-sm font-bold text-slate-900">Security preferences</Text>
          <View style={styles.prefsCard}>
            <ToggleRow
              label="Login alerts"
              subtitle="Notify on new device sign-in"
              value={loginAlerts}
              onValueChange={setLoginAlerts}
            />
            <View style={styles.divider} />
            <ToggleRow
              label="App lock"
              subtitle="Ask for confirmation when opening app"
              value={appLock}
              onValueChange={setAppLock}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  show,
  last,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  show: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldBlock, last && { marginBottom: 0 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder="••••••••"
        placeholderTextColor="#94A3B8"
        secureTextEntry={!show}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-4">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-bold text-slate-900">{label}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">{subtitle}</Text>
      </View>
      <Switch
        trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
        thumbColor={value ? colors.primary : '#F9FAFB'}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  heroCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  formCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  fieldBlock: { marginBottom: 14 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    marginTop: 14,
    paddingVertical: 15,
  },
  saveDisabled: { opacity: 0.7 },
  prefsCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginHorizontal: 16,
  },
});
