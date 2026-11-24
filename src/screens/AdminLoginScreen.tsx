import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { SupabaseSetupNotice } from '../components/SupabaseSetupNotice';
import { isSupabaseConfigured } from '../config/env';
import { signInAdmin } from '../services/adminService';
import { getErrorMessage } from '../utils/errorMessage';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type AdminLoginNavigation = NativeStackNavigationProp<RootStackParamList, 'AdminLogin'>;

export function AdminLoginScreen() {
  const navigation = useNavigation<AdminLoginNavigation>();
  const { isTablet, formMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    setErrorMessage('');

    if (!mobileNumber.trim() || !password.trim()) {
      setErrorMessage('Enter mobile number and password.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage('Supabase is not configured.');
      return;
    }

    setIsLoading(true);
    try {
      await signInAdmin(mobileNumber.trim(), password);
      navigation.replace('AdminDashboard');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Admin sign in failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              isTablet && { alignItems: 'center', paddingHorizontal: horizontalPadding },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={isTablet ? { maxWidth: formMaxWidth, width: '100%' } : undefined}>
            <View className="px-6 pt-4">
              <Pressable
                accessibilityRole="button"
                className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-white"
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.replace('Login');
                  }
                }}>
                <Icon color={colors.textPrimary} name="chevron-back" size={24} />
              </Pressable>

              <Text className="text-3xl font-bold text-slate-900">Admin Login</Text>
              <Text className="mt-2 text-base text-slate-500">
                Sign in with an admin mobile number to open the admin dashboard.
              </Text>
            </View>

            <View className="mt-6 px-6">
              <View className="rounded-3xl border border-slate-100 bg-white px-5 py-6" style={styles.formCard}>
                <SupabaseSetupNotice />

                <Text className="mb-2 text-sm font-medium text-slate-600">Mobile Number</Text>
                <View style={styles.inputWrapper}>
                  <Icon color={colors.primaryLight} name="call-outline" size={20} />
                  <TextInput
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    placeholder="Admin mobile"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                  />
                </View>

                <Text className="mb-2 mt-4 text-sm font-medium text-slate-600">Password</Text>
                <View style={styles.inputWrapper}>
                  <Icon color={colors.primaryLight} name="lock-closed-outline" size={20} />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    placeholder="Password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable onPress={() => setShowPassword(current => !current)}>
                    <Icon
                      color="#64748B"
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                    />
                  </Pressable>
                </View>

                {errorMessage ? (
                  <Text className="mt-4 text-sm text-red-500">{errorMessage}</Text>
                ) : null}

                <Pressable
                  className="mt-6 items-center rounded-2xl bg-primary py-4 active:opacity-90"
                  disabled={isLoading}
                  onPress={handleSignIn}>
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text className="text-base font-bold text-white">Sign In as Admin</Text>
                  )}
                </Pressable>

                <Pressable
                  className="mt-4 items-center py-2"
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.replace('Login');
                    }
                  }}>
                  <Text className="text-sm font-semibold text-slate-500">← Back to User Login</Text>
                </Pressable>
              </View>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  formCard: {
    elevation: 8,
    shadowColor: '#063D29',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  input: {
    color: '#0F172A',
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },
});
