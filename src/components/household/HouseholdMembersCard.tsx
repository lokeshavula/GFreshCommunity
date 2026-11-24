import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  addHouseholdChildMember,
  addHouseholdMemberByMobile,
  fetchHouseholdMembers,
  formatMemberRoleLabel,
  removeHouseholdMember,
  setPrimaryHouseholdMember,
  updateHouseholdMember,
} from '../../services/householdMemberService';
import { GfmHouseholdMember, HouseholdMemberRole } from '../../types/gfm';
import { colors } from '../../theme/colors';
import { getErrorMessage } from '../../utils/errorMessage';

type Props = {
  householdId: string;
  canManage: boolean;
  actorUserId?: string | null;
  onChanged?: () => void;
};

type AddMode = 'mobile' | 'child';

const EDITABLE_ROLES: Exclude<HouseholdMemberRole, 'PRIMARY'>[] = ['ADULT', 'CHILD'];

export function HouseholdMembersCard({
  householdId,
  canManage,
  actorUserId,
  onChanged,
}: Props) {
  const [members, setMembers] = useState<GfmHouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('mobile');
  const [mobile, setMobile] = useState('');
  const [childName, setChildName] = useState('');
  const [addRole, setAddRole] = useState<Exclude<HouseholdMemberRole, 'PRIMARY'>>('ADULT');
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchHouseholdMembers(householdId);
      setMembers(rows);
    } catch (error) {
      setMembers([]);
      setLoadError(getErrorMessage(error, 'Could not load family members.'));
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const refresh = async () => {
    await loadMembers();
    onChanged?.();
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      if (addMode === 'mobile') {
        if (!mobile.trim()) {
          Alert.alert('Mobile required', 'Enter the family member mobile number.');
          return;
        }
        await addHouseholdMemberByMobile({
          householdId,
          mobileNumber: mobile.trim(),
          role: addRole,
          addedByUserId: actorUserId ?? null,
        });
      } else {
        if (!childName.trim()) {
          Alert.alert('Name required', 'Enter the child name.');
          return;
        }
        await addHouseholdChildMember({
          householdId,
          displayName: childName.trim(),
          addedByUserId: actorUserId ?? null,
        });
      }
      setMobile('');
      setChildName('');
      setShowAddForm(false);
      await refresh();
      Alert.alert('Added', 'Family member added to household.');
    } catch (error) {
      Alert.alert('Could not add member', getErrorMessage(error, 'Add failed.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = (member: GfmHouseholdMember) => {
    if (!member.userId) {
      Alert.alert('App account required', 'Primary resident must have a registered app login.');
      return;
    }
    Alert.alert(
      'Set as primary',
      `Make ${member.displayName} the primary resident? They will manage household members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set primary',
          onPress: async () => {
            try {
              await setPrimaryHouseholdMember(member.id, actorUserId ?? null);
              await refresh();
            } catch (error) {
              Alert.alert('Failed', getErrorMessage(error, 'Could not set primary.'));
            }
          },
        },
      ],
    );
  };

  const handleChangeRole = (member: GfmHouseholdMember) => {
    if (member.role === 'CHILD') {
      if (!member.userId) {
        Alert.alert('Cannot promote', 'Child profiles without an app login cannot become adults.');
        return;
      }
    }
    const nextRole = member.role === 'ADULT' ? 'CHILD' : 'ADULT';
    Alert.alert(
      'Change role',
      `Change ${member.displayName} to ${formatMemberRoleLabel(nextRole)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              await updateHouseholdMember(member.id, { role: nextRole });
              await refresh();
            } catch (error) {
              Alert.alert('Failed', getErrorMessage(error, 'Could not update role.'));
            }
          },
        },
      ],
    );
  };

  const handleRemove = (member: GfmHouseholdMember) => {
    Alert.alert(
      'Remove member',
      `Remove ${member.displayName} from this household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeHouseholdMember(member.id, actorUserId ?? null);
              await refresh();
            } catch (error) {
              Alert.alert('Failed', getErrorMessage(error, 'Could not remove member.'));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Icon color={colors.primary} name="people" size={18} />
          <Text className="ml-2 text-sm font-bold text-slate-900">Family members</Text>
        </View>
        {canManage ? (
          <Pressable style={styles.addBtn} onPress={() => setShowAddForm(current => !current)}>
            <Icon color={colors.primary} name={showAddForm ? 'close' : 'add'} size={16} />
            <Text className="ml-1 text-xs font-bold text-primary">
              {showAddForm ? 'Close' : 'Add'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {showAddForm && canManage ? (
        <View style={styles.addForm}>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeChip, addMode === 'mobile' && styles.modeChipActive]}
              onPress={() => setAddMode('mobile')}>
              <Text style={[styles.modeChipText, addMode === 'mobile' && styles.modeChipTextActive]}>
                By mobile
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeChip, addMode === 'child' && styles.modeChipActive]}
              onPress={() => setAddMode('child')}>
              <Text style={[styles.modeChipText, addMode === 'child' && styles.modeChipTextActive]}>
                Child profile
              </Text>
            </Pressable>
          </View>

          {addMode === 'mobile' ? (
            <>
              <TextInput
                keyboardType="phone-pad"
                placeholder="Registered mobile number"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
              />
              <View style={styles.roleRow}>
                {EDITABLE_ROLES.map(role => (
                  <Pressable
                    key={role}
                    style={[styles.roleChip, addRole === role && styles.roleChipActive]}
                    onPress={() => setAddRole(role)}>
                    <Text
                      style={[styles.roleChipText, addRole === role && styles.roleChipTextActive]}>
                      {formatMemberRoleLabel(role)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-3 text-xs text-slate-500">
                User must already be registered and approved in the app.
              </Text>
            </>
          ) : (
            <>
              <TextInput
                placeholder="Child name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={childName}
                onChangeText={setChildName}
              />
              <Text className="mb-3 text-xs text-slate-500">
                Child profiles do not get a separate login. Primary or adult members place orders.
              </Text>
            </>
          )}

          <Pressable disabled={saving} style={styles.saveBtn} onPress={handleAdd}>
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Add member</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : loadError ? (
        <View>
          <Text className="text-sm text-slate-600">{loadError}</Text>
          <Pressable style={styles.retryBtn} onPress={loadMembers}>
            <Text className="text-sm font-bold text-primary">Retry</Text>
          </Pressable>
        </View>
      ) : members.length === 0 ? (
        <Text className="text-sm text-slate-500">No family members added yet.</Text>
      ) : (
        members.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberInitial}>
                {member.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900">{member.displayName}</Text>
              {member.mobileNumber ? (
                <Text className="text-xs text-slate-500">{member.mobileNumber}</Text>
              ) : (
                <Text className="text-xs text-slate-400">No app login</Text>
              )}
              <View className="mt-1 flex-row flex-wrap items-center gap-2">
                <View style={[styles.rolePill, member.role === 'PRIMARY' && styles.primaryPill]}>
                  <Text
                    style={[
                      styles.rolePillText,
                      member.role === 'PRIMARY' && styles.primaryPillText,
                    ]}>
                    {formatMemberRoleLabel(member.role)}
                  </Text>
                </View>
                <Text className="text-[10px] text-slate-400">
                  {member.canOrder ? 'Can order' : 'View only'}
                </Text>
              </View>
            </View>
            {canManage && member.role !== 'PRIMARY' ? (
              <View style={styles.actions}>
                {member.userId ? (
                  <Pressable hitSlop={6} onPress={() => handleSetPrimary(member)}>
                    <Icon color={colors.primary} name="star-outline" size={18} />
                  </Pressable>
                ) : null}
                <Pressable hitSlop={6} onPress={() => handleChangeRole(member)}>
                  <Icon color="#64748B" name="swap-horizontal" size={18} />
                </Pressable>
                <Pressable hitSlop={6} onPress={() => handleRemove(member)}>
                  <Icon color={colors.danger} name="trash-outline" size={18} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addForm: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modeChip: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  roleChip: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipActive: {
    backgroundColor: '#ECFDF3',
    borderColor: colors.primary,
  },
  roleChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: colors.primary,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  memberRow: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
  },
  memberAvatar: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  memberInitial: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryPill: {
    backgroundColor: '#ECFDF3',
  },
  rolePillText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  primaryPillText: {
    color: colors.primary,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
});
