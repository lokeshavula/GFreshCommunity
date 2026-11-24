import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { getCurrentUser, updateDeliveryAddress } from '../services/userService';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryAddress'>;

export function DeliveryAddressScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingBottom: insets.bottom + 28,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [blockNumber, setBlockNumber] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const user = await getCurrentUser();
        if (!user) {
          navigation.replace('Login');
          return;
        }
        setUserId(user.id);
        setFullName(user.fullName);
        setMobile(user.mobileNumber);
        setBlockNumber(user.blockNumber);
        setFlatNo(user.flatNo);
        setLoading(false);
      })();
    }, [navigation]),
  );

  const handleSave = async () => {
    if (!userId) {
      return;
    }

    setSaving(true);
    try {
      await updateDeliveryAddress(userId, blockNumber, flatNo);
      Alert.alert('Address updated', 'Your delivery address has been saved.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Update failed', getErrorMessage(error, 'Could not save address.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Where we deliver from the community mart"
        title="Delivery address"
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
              <Icon color={colors.primaryDark} name="location" size={22} />
            </View>
            <Text className="mt-3 text-base font-bold text-slate-900">Community delivery point</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Orders are delivered from G-Fresh Mart straight to your block and flat.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Field label="Resident" value={fullName} editable={false} />
            <Field label="Mobile" value={mobile} editable={false} />
            <EditableField
              label="Block number"
              placeholder="e.g. A / Tower 2"
              value={blockNumber}
              onChangeText={setBlockNumber}
            />
            <EditableField
              label="Flat number"
              placeholder="e.g. 101"
              value={flatNo}
              onChangeText={setFlatNo}
              last
            />
          </View>

          <View style={styles.previewCard}>
            <Icon color={colors.primary} name="home-outline" size={18} />
            <Text className="ml-2 flex-1 text-sm text-slate-700">
              Deliver to Block {blockNumber || '—'}, Flat {flatNo || '—'}
            </Text>
          </View>

          <Pressable
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveDisabled]}
            onPress={handleSave}>
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-sm font-bold text-white">Save address</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string; editable?: boolean }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readonlyBox}>
        <Text style={styles.readonlyText}>{value}</Text>
      </View>
    </View>
  );
}

function EditableField({
  label,
  value,
  placeholder,
  onChangeText,
  last,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldBlock, last && { marginBottom: 0 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
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
    marginBottom: 16,
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
  readonlyBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  readonlyText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
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
  previewCard: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 16,
    flexDirection: 'row',
    marginTop: 14,
    padding: 14,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 15,
  },
  saveDisabled: { opacity: 0.7 },
});
