import { useEffect, useState } from 'react';
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
import { fetchCommunities } from '../services/communityService';
import { registerUser } from '../services/userService';
import { GfmCommunity } from '../types/gfm';
import { getRouteForUser } from '../utils/authGuard';
import { getErrorMessage } from '../utils/errorMessage';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type RegisterNavigation = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNavigation>();
  const { isTablet, formMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [tower, setTower] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [password, setPassword] = useState('');
  const [communities, setCommunities] = useState<GfmCommunity[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchCommunities().then(list => {
      setCommunities(list);
      if (list.length > 0) {
        setSelectedCommunityId(list[0].id);
      }
    });
  }, []);

  const handleRegister = async () => {
    setErrorMessage('');

    if (
      !fullName.trim() ||
      !mobileNumber.trim() ||
      !tower.trim() ||
      !flatNo.trim() ||
      !password.trim() ||
      !selectedCommunityId
    ) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      setErrorMessage('Enter a valid 10-digit mobile number.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage('Add your Supabase anon key in src/config/supabase.keys.ts first.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await registerUser({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || undefined,
        communityId: selectedCommunityId,
        tower: tower.trim(),
        blockNumber: tower.trim(),
        flatNo: flatNo.trim(),
        password,
      });
      navigation.replace(getRouteForUser(user));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Registration failed. Please try again.'));
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
            contentContainerStyle={[
              styles.scrollContent,
              isTablet && { alignItems: 'center', paddingHorizontal: horizontalPadding },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={isTablet ? { maxWidth: formMaxWidth, width: '100%' } : undefined}>
              <View className="px-6 pt-2 pb-4 flex-row items-center">
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-white"
                  onPress={() => navigation.goBack()}>
                  <Icon color="#0F172A" name="chevron-back" size={22} />
                </Pressable>
                <View className="ml-3 flex-1">
                  <Text className="text-xl font-bold text-slate-900">Join G Fresh Mart</Text>
                  <Text className="text-xs text-slate-500">Community resident registration</Text>
                </View>
              </View>

              <View className="px-6">
                <View className="rounded-3xl border border-white bg-white px-5 py-6" style={styles.formCard}>
                  <View style={styles.notice}>
                    <Icon color={colors.primary} name="shield-checkmark-outline" size={18} />
                    <Text style={styles.noticeText}>
                      Your account will be reviewed by the community admin before you can shop.
                    </Text>
                  </View>

                  <SupabaseSetupNotice />
                  <Field label="Full Name *" icon="person-outline" value={fullName} onChangeText={setFullName} />
                  <Field
                    label="Mobile Number *"
                    icon="call-outline"
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    keyboardType="phone-pad"
                  />
                  <Field
                    label="Email (optional)"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                  />

                  <Text className="mb-2 text-sm font-medium text-slate-600">Community *</Text>
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {communities.map(community => {
                      const selected = selectedCommunityId === community.id;
                      return (
                        <Pressable
                          key={community.id}
                          style={[styles.communityChip, selected && styles.communityChipActive]}
                          onPress={() => setSelectedCommunityId(community.id)}>
                          <Icon
                            color={selected ? colors.white : colors.primary}
                            name="business-outline"
                            size={16}
                          />
                          <View className="flex-1">
                            <Text style={[styles.communityName, selected && styles.communityNameActive]}>
                              {community.name}
                            </Text>
                            {community.city ? (
                              <Text style={[styles.communityCity, selected && styles.communityCityActive]}>
                                {community.city}
                                {community.state ? `, ${community.state}` : ''}
                              </Text>
                            ) : null}
                          </View>
                          {selected ? <Icon color={colors.white} name="checkmark-circle" size={18} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Field
                    label="Tower / Block *"
                    icon="layers-outline"
                    value={tower}
                    onChangeText={setTower}
                  />
                  <Field label="Flat Number *" icon="home-outline" value={flatNo} onChangeText={setFlatNo} />
                  <Field
                    label="Password *"
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />

                  {errorMessage ? (
                    <Text className="mt-4 text-sm text-red-500">{errorMessage}</Text>
                  ) : null}

                  <Pressable
                    className="mt-6 items-center rounded-2xl bg-primary py-4 active:opacity-90"
                    disabled={isLoading}
                    onPress={handleRegister}>
                    {isLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text className="text-base font-bold text-white">Submit Registration</Text>
                    )}
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

function Field({
  label,
  icon,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  icon: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  secureTextEntry?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-slate-600">{label}</Text>
      <View style={styles.inputWrapper}>
        <Icon color={colors.primaryLight} name={icon} size={20} />
        <TextInput
          autoCapitalize="none"
          keyboardType={keyboardType}
          placeholder={label.replace(' *', '')}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
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
  notice: {
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    padding: 12,
  },
  noticeText: {
    color: '#166534',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  communityChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  communityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  communityName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  communityNameActive: {
    color: colors.white,
  },
  communityCity: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  communityCityActive: {
    color: 'rgba(255,255,255,0.75)',
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
