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
import {
  approveUser,
  fetchUserForReview,
  rejectUser,
  requestMoreInfo,
} from '../services/approvalService';
import { getCurrentAdmin } from '../services/adminService';
import { previewHouseholdForUser } from '../services/householdService';
import { GfmHousehold, PendingUserRow } from '../types/gfm';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useResponsiveLayout } from '../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdminUserReview'>;
type ReviewRoute = RouteProp<RootStackParamList, 'AdminUserReview'>;

const REJECT_REASONS = [
  'Invalid flat number',
  'Resident verification failed',
  'Duplicate account',
  'Incorrect community',
  'Other',
];

export function AdminUserReviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ReviewRoute>();
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();
  const [user, setUser] = useState<PendingUserRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [existingHousehold, setExistingHousehold] = useState<GfmHousehold | null>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserForReview(route.params.userId);
      setUser(data);
      if (data) {
        const household = await previewHouseholdForUser({
          communityId: data.communityId,
          tower: data.tower,
          blockNumber: data.blockNumber,
          flatNo: data.flatNo,
        });
        setExistingHousehold(household);
      } else {
        setExistingHousehold(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [route.params.userId]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  const handleApprove = async () => {
    const admin = await getCurrentAdmin();
    if (!admin || !user) return;

    Alert.alert(
      'Approve resident',
      existingHousehold
        ? `${user.fullName} will be linked to the existing household at Tower ${existingHousehold.tower} · ${existingHousehold.flatNumber}. Primary: ${existingHousehold.primaryUserName ?? 'Unknown'}.`
        : `Approve ${user.fullName} and create a new household for Tower ${user.tower ?? user.blockNumber} · ${user.flatNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading('approve');
            try {
              await approveUser(user.id, admin.id);
              Alert.alert('Approved', `${user.fullName} can now access the store.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error, 'Could not approve user.'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    const admin = await getCurrentAdmin();
    if (!admin || !user || !rejectReason.trim()) {
      Alert.alert('Reason required', 'Please select or enter a rejection reason.');
      return;
    }

    setActionLoading('reject');
    try {
      await rejectUser(user.id, admin.id, rejectReason.trim());
      Alert.alert('Rejected', 'The user has been notified.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Could not reject user.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestInfo = async () => {
    const admin = await getCurrentAdmin();
    if (!admin || !user || !infoMessage.trim()) {
      Alert.alert('Message required', 'Please enter what information you need.');
      return;
    }

    setActionLoading('info');
    try {
      await requestMoreInfo(user.id, admin.id, infoMessage.trim());
      Alert.alert('Sent', 'The user has been notified to provide more information.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Could not send request.'));
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text className="mt-3 text-sm text-slate-500">Loading resident details…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <Icon color={colors.textMuted} name="person-outline" size={48} />
        <Text className="mt-3 text-base font-bold text-slate-700">User not found</Text>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text className="text-sm font-bold text-primary">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const tower = user.tower ?? user.blockNumber;
  const isPending =
    user.accountStatus === 'PENDING_APPROVAL' || user.accountStatus === 'REGISTERED';

  return (
    <View className="flex-1 bg-slate-50">
      <View style={[styles.header, { paddingTop: insets.top + 8 }, shellStyle('page')]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon color={colors.textPrimary} name="chevron-back" size={24} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">Review registration</Text>
          <Text className="text-xs text-slate-500">Verify resident details</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, shellStyle('page')]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text className="text-2xl font-bold text-green-700">
              {user.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{user.fullName}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {(user.accountStatus ?? 'PENDING').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <Section title="Contact">
          <Row icon="call-outline" label="Mobile" value={user.mobileNumber} />
          {user.email ? <Row icon="mail-outline" label="Email" value={user.email} /> : null}
        </Section>

        <Section title="Residence">
          <Row icon="business-outline" label="Community" value={user.communityName ?? '—'} />
          <Row icon="layers-outline" label="Tower / Block" value={tower} />
          <Row icon="home-outline" label="Flat number" value={user.flatNo} />
          <Row
            icon="calendar-outline"
            label="Registered"
            value={new Date(user.createdAt).toLocaleString('en-IN')}
          />
        </Section>

        {existingHousehold ? (
          <View style={styles.existingHouseholdCard}>
            <Icon color="#C2410C" name="information-circle-outline" size={20} />
            <View className="ml-2 flex-1">
              <Text style={styles.existingTitle}>Existing household found</Text>
              <Text style={styles.existingBody}>
                Tower {existingHousehold.tower} · {existingHousehold.flatNumber} — Primary:{' '}
                {existingHousehold.primaryUserName ?? 'Unknown'}
              </Text>
              <Text style={styles.existingHint}>
                Approving will link this user to the existing household (no duplicate created).
              </Text>
            </View>
          </View>
        ) : null}

        {isPending ? (
          <>
            {!showRejectForm && !showInfoForm ? (
              <View style={styles.actions}>
                <Pressable
                  disabled={Boolean(actionLoading)}
                  style={[styles.approveBtn, actionLoading === 'approve' && { opacity: 0.7 }]}
                  onPress={handleApprove}>
                  {actionLoading === 'approve' ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Icon color={colors.white} name="checkmark-circle-outline" size={20} />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </>
                  )}
                </Pressable>

                <Pressable style={styles.outlineBtn} onPress={() => setShowInfoForm(true)}>
                  <Icon color={colors.primary} name="chatbubble-ellipses-outline" size={18} />
                  <Text style={styles.outlineBtnText}>Request more info</Text>
                </Pressable>

                <Pressable style={styles.rejectOutlineBtn} onPress={() => setShowRejectForm(true)}>
                  <Icon color="#B91C1C" name="close-circle-outline" size={18} />
                  <Text style={styles.rejectOutlineText}>Reject</Text>
                </Pressable>
              </View>
            ) : null}

            {showInfoForm ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Request more information</Text>
                <TextInput
                  multiline
                  placeholder="e.g. Please provide your correct flat number."
                  placeholderTextColor="#94A3B8"
                  style={styles.textArea}
                  value={infoMessage}
                  onChangeText={setInfoMessage}
                />
                <View style={styles.formActions}>
                  <Pressable onPress={() => setShowInfoForm(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={actionLoading === 'info'}
                    style={styles.sendBtn}
                    onPress={handleRequestInfo}>
                    {actionLoading === 'info' ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.sendBtnText}>Send request</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}

            {showRejectForm ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Reject registration</Text>
                <View style={styles.reasonChips}>
                  {REJECT_REASONS.map(reason => (
                    <Pressable
                      key={reason}
                      style={[styles.reasonChip, rejectReason === reason && styles.reasonChipActive]}
                      onPress={() => setRejectReason(reason)}>
                      <Text
                        style={[
                          styles.reasonChipText,
                          rejectReason === reason && styles.reasonChipTextActive,
                        ]}>
                        {reason}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  multiline
                  placeholder="Additional notes (optional)"
                  placeholderTextColor="#94A3B8"
                  style={styles.textArea}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                />
                <View style={styles.formActions}>
                  <Pressable onPress={() => setShowRejectForm(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={actionLoading === 'reject'}
                    style={styles.rejectBtn}
                    onPress={handleReject}>
                    {actionLoading === 'reject' ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.sendBtnText}>Confirm reject</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon color={colors.primary} name={icon} size={16} />
      </View>
      <View className="flex-1">
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
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
  backLink: {
    marginTop: 16,
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
  scroll: {
    paddingBottom: 40,
    paddingTop: 16,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 24,
  },
  avatarLarge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  statusBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
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
  actions: {
    gap: 10,
    marginTop: 4,
  },
  approveBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  approveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  outlineBtn: {
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
  outlineBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  rejectOutlineBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  rejectOutlineText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
    padding: 16,
  },
  formTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reasonChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reasonChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  reasonChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  reasonChipTextActive: {
    color: '#B91C1C',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 90,
    padding: 12,
    textAlignVertical: 'top',
  },
  formActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  cancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  rejectBtn: {
    backgroundColor: '#B91C1C',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  existingHouseholdCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 14,
  },
  existingTitle: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '800',
  },
  existingBody: {
    color: '#9A3412',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  existingHint: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
