import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { signInWithMobile } from '../services/userService';
import { saveCurrentAdmin } from '../services/adminSessionService';
import { getRouteForUser } from '../utils/authGuard';
import { getErrorMessage } from '../utils/errorMessage';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

const LOGO = require('../../assests/lg-enterprises-logo.png');

type LoginNavigation = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNavigation>();
  const { isTablet, formMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    setErrorMessage('');

    if (!mobileNumber.trim() || !password.trim()) {
      setErrorMessage('Please enter mobile number and password.');
      return;
    }

    if (!isSupabaseConfigured()) {
      navigation.replace('Home');
      return;
    }

    setIsLoading(true);
    try {
      const user = await signInWithMobile(mobileNumber.trim(), password);

      if (user.isAdmin) {
        await saveCurrentAdmin({
          id: user.id,
          fullName: user.fullName,
          mobileNumber: user.mobileNumber,
        });
        navigation.replace('AdminDashboard');
        return;
      }

      navigation.replace(getRouteForUser(user));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Sign in failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-accent/20" />
      <View className="absolute -left-16 top-32 h-40 w-40 rounded-full bg-primary/10" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.scrollContent,
              isTablet && [styles.tabletScrollContent, { paddingHorizontal: horizontalPadding }],
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View
              style={[
                isTablet && [styles.tabletFormWrap, { maxWidth: formMaxWidth }],
              ]}>
            <View className="overflow-hidden rounded-b-[36px] bg-primary-dark px-6 pb-16 pt-4">
              <View className="absolute -right-8 top-8 h-32 w-32 rounded-full bg-white/5" />
              <View className="absolute bottom-6 left-4 h-20 w-20 rounded-full bg-accent/10" />

              <View className="mb-6 flex-row items-center gap-3">
                <View style={styles.logoWrap}>
                  <Image resizeMode="contain" source={LOGO} style={styles.logo} />
                </View>
                <View>
                  <Text className="text-lg font-bold text-white">LG Enterprises</Text>
                  <Text className="text-xs text-white/60">Your store • everyday more</Text>
                </View>
              </View>

              <Text className="text-3xl font-bold text-white">Welcome back</Text>
              <Text className="mt-2 text-base text-white/70">
                Sign in with your community mobile number.
              </Text>
            </View>

            <View className="-mt-10 px-6">
              <View
                className="rounded-3xl border border-white bg-white px-5 py-6"
                style={styles.formCard}>
                <Text className="mb-5 text-xl font-bold text-slate-900">Sign in</Text>

                <SupabaseSetupNotice />

                <Text className="mb-2 text-sm font-medium text-slate-600">Mobile Number</Text>
                <View style={styles.inputWrapper}>
                  <Icon color={colors.primaryLight} name="call-outline" size={20} />
                  <TextInput
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    placeholder="9876543210"
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
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setShowPassword(current => !current)}>
                    <Icon
                      color="#64748B"
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                    />
                  </Pressable>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <Pressable
                    accessibilityRole="checkbox"
                    className="flex-row items-center gap-2"
                    onPress={() => setRememberMe(current => !current)}>
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-md border ${
                        rememberMe
                          ? 'border-primary bg-primary'
                          : 'border-slate-300 bg-white'
                      }`}>
                      {rememberMe ? (
                        <Icon color={colors.white} name="checkmark" size={14} />
                      ) : null}
                    </View>
                    <Text className="text-sm text-slate-600">Remember me</Text>
                  </Pressable>
                </View>

                {errorMessage ? (
                  <Text className="mt-4 text-sm text-red-500">{errorMessage}</Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  className="mt-6 items-center rounded-2xl bg-primary py-4 active:opacity-90"
                  disabled={isLoading}
                  onPress={handleSignIn}>
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text className="text-base font-bold text-white">Sign In</Text>
                  )}
                </Pressable>
              </View>

              <View className="mt-6 flex-row items-center justify-center gap-1">
                <Text className="text-sm text-slate-500">New to LG Enterprises?</Text>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Register')}>
                  <Text className="text-sm font-bold text-primary">Create account</Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                className="mt-4 items-center rounded-2xl border border-primary/30 bg-primary/5 py-3"
                onPress={() => navigation.navigate('AdminLogin')}>
                <Text className="text-sm font-bold text-primary">Admin login →</Text>
              </Pressable>
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
  tabletScrollContent: {
    alignItems: 'center',
  },
  tabletFormWrap: {
    width: '100%',
  },
  logoWrap: {
    backgroundColor: colors.white,
    borderRadius: 14,
    height: 52,
    overflow: 'hidden',
    padding: 4,
    width: 52,
  },
  logo: {
    height: '100%',
    width: '100%',
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
