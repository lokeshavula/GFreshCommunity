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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { HouseholdMembersCard } from '../components/household/HouseholdMembersCard';
import { fetchHouseholdById, updateHousehold } from '../services/householdService';
import { GfmHousehold, HouseholdStatus } from '../types/gfm';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useResponsiveLayout } from '../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdminHouseholdDetail'>;
type DetailRoute = RouteProp<RootStackParamList, 'AdminHouseholdDetail'>;

const STATUSES: HouseholdStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

export function AdminHouseholdDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();
  const [household, setHousehold] = useState<GfmHousehold | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tower, setTower] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [status, setStatus] = useState<HouseholdStatus>('ACTIVE');

  const loadHousehold = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchHouseholdById(route.params.householdId);
      setHousehold(data);
      if (data) {
        setTower(data.tower);
        setFlatNumber(data.flatNumber);
        setStatus(data.status);
      }
    } finally {
      setIsLoading(false);
    }
  }, [route.params.householdId]);

  useFocusEffect(
    useCallback(() => {
      loadHousehold();
    }, [loadHousehold]),
  );

  const handleSave = async () => {
    if (!household) return;
    if (!tower.trim() || !flatNumber.trim()) {
      Alert.alert('Missing fields', 'Tower and flat number are required.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateHousehold(household.id, {
        tower: tower.trim(),
        flatNumber: flatNumber.trim(),
        status,
      });
      setHousehold(updated);
      setIsEditing(false);
      Alert.alert('Saved', 'Household updated successfully.');
    } catch (error) {
      Alert.alert('Could not save', getErrorMessage(error, 'Update failed.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text className="mt-3 text-sm text-slate-500">Loading household…</Text>
      </View>
    );
  }

  if (!household) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <Icon color={colors.textMuted} name="home-outline" size={48} />
        <Text className="mt-3 text-base font-bold text-slate-700">Household not found</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text className="mt-4 text-sm font-bold text-primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View style={[styles.header, { paddingTop: insets.top + 8 }, shellStyle('page')]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon color={colors.textPrimary} name="chevron-back" size={24} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">Household details</Text>
          <Text className="text-xs text-slate-500">
            Tower {household.tower} · {household.flatNumber}
          </Text>
        </View>
        {!isEditing ? (
          <Pressable style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Icon color={colors.primary} name="create-outline" size={18} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, shellStyle('page')]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Household information</Text>
          {isEditing ? (
            <>
              <Field label="Tower / Block" value={tower} onChangeText={setTower} />
              <Field label="Flat number" value={flatNumber} onChangeText={setFlatNumber} />
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.chipRow}>
                {STATUSES.map(item => (
                  <Pressable
                    key={item}
                    style={[styles.chip, status === item && styles.chipActive]}
                    onPress={() => setStatus(item)}>
                    <Text style={[styles.chipText, status === item && styles.chipTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.editActions}>
                <Pressable onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={isSaving}
                  style={styles.saveBtn}
                  onPress={handleSave}>
                  {isSaving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save changes</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Row label="Community" value={household.communityName ?? '—'} />
              <Row label="Tower / Block" value={household.tower} />
              <Row label="Flat number" value={household.flatNumber} />
              <Row label="Status" value={household.status} />
              <Row
                label="Created"
                value={new Date(household.createdAt).toLocaleString('en-IN')}
              />
              <Row
                label="Last updated"
                value={new Date(household.updatedAt).toLocaleString('en-IN')}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Primary resident</Text>
          <Row label="Name" value={household.primaryUserName ?? '—'} />
          <Row label="Mobile" value={household.primaryUserMobile ?? '—'} />
          {household.primaryUserEmail ? (
            <Row label="Email" value={household.primaryUserEmail} />
          ) : null}
        </View>

        <HouseholdMembersCard
          canManage
          householdId={household.id}
          onChanged={loadHousehold}
        />
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholder={label}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 14,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  editBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scroll: {
    paddingBottom: 40,
    paddingTop: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    marginBottom: 10,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.white,
  },
  editActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
