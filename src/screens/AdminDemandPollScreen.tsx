import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { AppStatusBar } from '../components/AppStatusBar';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  createDemandPollItem,
  deleteDemandPollItem,
  fetchActiveDemandPoll,
  fetchDemandSuggestions,
  updateDemandItemStatus,
} from '../services/demandPollService';
import { colors } from '../theme/colors';
import {
  DemandItemStatus,
  DemandPollItem,
  DemandPollSummary,
  DemandSuggestion,
} from '../types/demandPoll';
import { useResponsiveLayout } from '../utils/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;

export function AdminDemandPollScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { shellStyle, horizontalPadding, isTablet } = useResponsiveLayout();

  const [activeTab, setActiveTab] = useState<'ranking' | 'suggestions'>('ranking');
  const [summary, setSummary] = useState<DemandPollSummary | null>(null);
  const [suggestions, setSuggestions] = useState<DemandSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('🍎');
  const [newCategory, setNewCategory] = useState('fruits');
  const [newTargetQty, setNewTargetQty] = useState('');
  const [newEstimatedPrice, setNewEstimatedPrice] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pollData, sugData] = await Promise.all([
        fetchActiveDemandPoll(),
        fetchDemandSuggestions(),
      ]);
      setSummary(pollData);
      setSuggestions(sugData);
    } catch {
      Alert.alert('Error', 'Failed to load demand poll data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (item: DemandPollItem, nextStatus: DemandItemStatus) => {
    setIsUpdatingId(item.id);
    try {
      await updateDemandItemStatus(item.id, nextStatus);
      setSummary(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(it => (it.id === item.id ? { ...it, status: nextStatus } : it)),
        };
      });
    } catch {
      Alert.alert('Error', 'Could not update status');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleDeleteItem = (itemId: string, title: string) => {
    Alert.alert('Delete Poll Option', `Remove "${title}" from tomorrow's poll?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDemandPollItem(itemId);
            loadData();
          } catch {
            Alert.alert('Error', 'Failed to delete option.');
          }
        },
      },
    ]);
  };

  const handleCreateItem = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter item title.');
      return;
    }

    setIsCreating(true);
    try {
      await createDemandPollItem({
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || undefined,
        emoji: newEmoji.trim() || '📦',
        category: newCategory,
        orderTargetQty: newTargetQty.trim() || undefined,
        estimatedPrice: newEstimatedPrice ? Number(newEstimatedPrice) : undefined,
        unit: newUnit.trim() || 'kg',
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewSubtitle('');
      setNewTargetQty('');
      setNewEstimatedPrice('');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to create item.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddFromSuggestion = (sug: DemandSuggestion) => {
    setNewTitle(sug.itemTitle);
    setNewSubtitle(sug.note || '');
    setNewEmoji('✨');
    setShowAddModal(true);
  };

  const totalVotes = summary?.totalVotes || 0;
  const topItem = summary?.items?.[0];

  return (
    <View style={styles.screen}>
      <AppStatusBar lightContent />

      {/* Responsive Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingHorizontal: horizontalPadding }]}>
        <View style={styles.headerTopRow}>
          {/* Back & Title */}
          <View className="flex-row items-center flex-1 mr-2">
            <Pressable
              accessibilityLabel="Back to dashboard"
              accessibilityRole="button"
              style={styles.headerIconBtn}
              onPress={() => navigation.goBack()}>
              <Icon color={colors.white} name="arrow-back" size={20} />
            </Pressable>
            <View className="flex-1 ml-2.5">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text numberOfLines={1} style={styles.headerTitle}>Tomorrow’s Demand</Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text numberOfLines={1} style={styles.headerSubtitle}>
                Community voting results
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Refresh data"
              accessibilityRole="button"
              style={styles.headerIconBtn}
              onPress={loadData}>
              <Icon color={colors.white} name="refresh" size={17} />
            </Pressable>

            <Pressable
              accessibilityLabel="Add poll item"
              accessibilityRole="button"
              style={styles.addItemBtn}
              onPress={() => setShowAddModal(true)}>
              <Icon color="#063D29" name="add" size={16} />
              <Text style={styles.addItemBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>

        {/* Responsive KPI Metrics */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL VOTES</Text>
            <Text style={styles.kpiValue}>{totalVotes}</Text>
            <Text style={styles.kpiSub}>From residents</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOP DEMAND</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text style={{ fontSize: 15 }}>{topItem?.emoji || '🏆'}</Text>
              <Text numberOfLines={1} style={[styles.kpiValue, { fontSize: 14 }]}>
                {topItem?.title ? topItem.title.split(' ')[0] : 'None'}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.kpiSub}>{topItem?.voteCount || 0} votes</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>DISPATCH</Text>
            <Text style={[styles.kpiValue, { fontSize: 14, color: '#FDE047' }]}>
              Tomorrow
            </Text>
            <Text style={styles.kpiSub}>5:00 AM</Text>
          </View>
        </View>

        {/* Segmented Tab Bar */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'ranking' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ranking')}>
            <Icon
              color={activeTab === 'ranking' ? colors.primary : 'rgba(255, 255, 255, 0.7)'}
              name="stats-chart"
              size={14}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabBtnText,
                activeTab === 'ranking' && styles.tabBtnTextActive,
              ]}>
              Rankings ({summary?.items.length || 0})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'suggestions' && styles.tabBtnActive]}
            onPress={() => setActiveTab('suggestions')}>
            <Icon
              color={activeTab === 'suggestions' ? colors.primary : 'rgba(255, 255, 255, 0.7)'}
              name="bulb"
              size={14}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabBtnText,
                activeTab === 'suggestions' && styles.tabBtnTextActive,
              ]}>
              Requests ({suggestions.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading community votes...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          style={styles.mainScroll}>
          <View style={[styles.contentContainer, shellStyle('page')]}>
            {activeTab === 'ranking' ? (
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text style={styles.sectionTitle}>Procurement Demand List</Text>
                    <Text style={styles.sectionSub}>
                      Ranked in real-time by resident votes
                    </Text>
                  </View>
                </View>

                {summary?.items.map((item, idx) => {
                  const percentage = totalVotes > 0 ? Math.round((item.voteCount / totalVotes) * 100) : 0;
                  const isTopRank = idx === 0 && item.voteCount > 0;
                  const isUpdating = isUpdatingId === item.id;
                  const isOrdered = item.status === 'ordered' || item.status === 'procured';

                  return (
                    <View key={item.id} style={styles.itemCard}>
                      {/* Card Top Row */}
                      <View className="flex-row items-start justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View
                            style={[
                              styles.rankBadge,
                              isTopRank && styles.rankBadgeTop,
                            ]}>
                            <Text
                              style={[
                                styles.rankBadgeText,
                                isTopRank && styles.rankBadgeTextTop,
                              ]}>
                              #{idx + 1}
                            </Text>
                          </View>

                          <View style={styles.itemEmojiWrap}>
                            <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                          </View>

                          <View className="flex-1 ml-2.5">
                            <View className="flex-row items-center gap-1.5 flex-wrap">
                              <Text numberOfLines={1} style={styles.itemTitle}>{item.title}</Text>
                              {isTopRank ? (
                                <View style={styles.highDemandBadge}>
                                  <Text style={styles.highDemandBadgeText}>TOP</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text numberOfLines={1} style={styles.itemSubtitle}>
                              {item.subtitle || `Category: ${item.category}`}
                            </Text>
                          </View>
                        </View>

                        {/* Votes Counter */}
                        <View style={styles.itemVoteBox}>
                          <Text style={styles.itemVoteCount}>{item.voteCount}</Text>
                          <Text style={styles.itemVotePct}>{percentage}%</Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${percentage}%` },
                            isTopRank && { backgroundColor: '#10B981' },
                          ]}
                        />
                      </View>

                      {/* Target & Price Meta */}
                      <View style={styles.metaRow}>
                        {item.orderTargetQty ? (
                          <View className="flex-row items-center gap-1">
                            <Icon color="#64748B" name="cube-outline" size={12} />
                            <Text style={styles.metaText}>
                              Target: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{item.orderTargetQty}</Text>
                            </Text>
                          </View>
                        ) : null}

                        {item.estimatedPrice ? (
                          <View className="flex-row items-center gap-1">
                            <Icon color="#64748B" name="pricetag-outline" size={12} />
                            <Text style={styles.metaText}>
                              Est: ₹{item.estimatedPrice}/{item.unit}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Actions */}
                      <View style={styles.cardActionsRow}>
                        <View className="flex-row items-center gap-2 flex-1 flex-wrap">
                          {isOrdered ? (
                            <View style={styles.orderedStatusPill}>
                              <Icon color="#065F46" name="checkmark-done" size={13} />
                              <Text style={styles.orderedStatusText}>ORDERED</Text>
                            </View>
                          ) : (
                            <Pressable
                              disabled={isUpdating}
                              style={styles.orderActionBtn}
                              onPress={() => handleStatusChange(item, 'ordered')}>
                              {isUpdating ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                              ) : (
                                <>
                                  <Icon color="#FFFFFF" name="cart-outline" size={13} />
                                  <Text style={styles.orderActionBtnText}>
                                    Mark Ordered
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          )}

                          {isOrdered ? (
                            <Pressable
                              style={styles.resetBtn}
                              onPress={() => handleStatusChange(item, 'active')}>
                              <Text style={styles.resetBtnText}>Reset</Text>
                            </Pressable>
                          ) : null}
                        </View>

                        <Pressable
                          hitSlop={8}
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteItem(item.id, item.title)}>
                          <Icon color="#EF4444" name="trash-outline" size={15} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Suggestions Tab */
              <View>
                <View className="mb-3">
                  <Text style={styles.sectionTitle}>Resident Requests</Text>
                  <Text style={styles.sectionSub}>
                    Items suggested by community residents
                  </Text>
                </View>

                {suggestions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={{ fontSize: 28 }}>💡</Text>
                    <Text style={styles.emptyTitle}>No resident requests yet</Text>
                    <Text style={styles.emptySub}>
                      When residents suggest produce via the Home poll, they will appear here.
                    </Text>
                  </View>
                ) : (
                  suggestions.map(sug => (
                    <View key={sug.id} style={styles.sugCard}>
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-2">
                          <Text style={styles.sugTitle}>{sug.itemTitle}</Text>
                          <Text numberOfLines={1} style={styles.sugUser}>
                            By {sug.userName} {sug.userMobile ? `(${sug.userMobile})` : ''}
                          </Text>
                          {sug.note ? (
                            <View style={styles.sugNoteBox}>
                              <Text numberOfLines={2} style={styles.sugNoteText}>"{sug.note}"</Text>
                            </View>
                          ) : null}
                        </View>

                        <Pressable
                          style={styles.addFromSugBtn}
                          onPress={() => handleAddFromSuggestion(sug)}>
                          <Icon color="#059669" name="add-circle" size={13} />
                          <Text style={styles.addFromSugBtnText}>Add</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Responsive Add Item Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}>
          <Pressable style={styles.scrim} onPress={() => setShowAddModal(false)} />

          <View style={styles.modalCard}>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={styles.modalTitle}>Add Poll Option</Text>
              <Pressable hitSlop={10} onPress={() => setShowAddModal(false)}>
                <Icon color="#64748B" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Title *</Text>
                <TextInput
                  placeholder="e.g. Alphonso Mangoes, Tender Coconuts"
                  placeholderTextColor="#94A3B8"
                  style={styles.modalInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Subtitle / Source</Text>
                <TextInput
                  placeholder="e.g. Ratnagiri Farm Direct"
                  placeholderTextColor="#94A3B8"
                  style={styles.modalInput}
                  value={newSubtitle}
                  onChangeText={setNewSubtitle}
                />
              </View>

              <View className="flex-row gap-2.5">
                <View className="flex-1" style={styles.formGroup}>
                  <Text style={styles.label}>Emoji</Text>
                  <TextInput
                    placeholder="🥭"
                    placeholderTextColor="#94A3B8"
                    style={[styles.modalInput, { textAlign: 'center', fontSize: 18 }]}
                    value={newEmoji}
                    onChangeText={setNewEmoji}
                  />
                </View>

                <View className="flex-1" style={styles.formGroup}>
                  <Text style={styles.label}>Target Qty</Text>
                  <TextInput
                    placeholder="e.g. 50 kg"
                    placeholderTextColor="#94A3B8"
                    style={styles.modalInput}
                    value={newTargetQty}
                    onChangeText={setNewTargetQty}
                  />
                </View>
              </View>

              <View className="flex-row gap-2.5">
                <View className="flex-1" style={styles.formGroup}>
                  <Text style={styles.label}>Est Price (₹)</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="e.g. 120"
                    placeholderTextColor="#94A3B8"
                    style={styles.modalInput}
                    value={newEstimatedPrice}
                    onChangeText={setNewEstimatedPrice}
                  />
                </View>

                <View className="flex-1" style={styles.formGroup}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    placeholder="kg / piece"
                    placeholderTextColor="#94A3B8"
                    style={styles.modalInput}
                    value={newUnit}
                    onChangeText={setNewUnit}
                  />
                </View>
              </View>

              <Pressable
                disabled={isCreating}
                style={styles.createBtn}
                onPress={handleCreateItem}>
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Create Option</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  header: {
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 14,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 11,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
  },
  addItemBtn: {
    alignItems: 'center',
    backgroundColor: '#FDE047',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addItemBtnText: {
    color: '#063D29',
    fontSize: 11.5,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  kpiCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  kpiLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  kpiValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  kpiSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 8.5,
    fontWeight: '500',
    marginTop: 1,
  },
  tabBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 12,
    padding: 3,
  },
  tabBtn: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  tabBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  mainScroll: {
    flex: 1,
  },
  loadingBox: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 10,
    padding: 13,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  rankBadgeTop: {
    backgroundColor: '#FEF3C7',
  },
  rankBadgeText: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
  },
  rankBadgeTextTop: {
    color: '#B45309',
  },
  itemEmojiWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    marginLeft: 6,
    width: 38,
  },
  itemTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  highDemandBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  highDemandBadgeText: {
    color: '#DC2626',
    fontSize: 7.5,
    fontWeight: '900',
  },
  itemVoteBox: {
    alignItems: 'flex-end',
  },
  itemVoteCount: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '900',
  },
  itemVotePct: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  progressBarBg: {
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    height: 5,
    marginVertical: 9,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  metaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  cardActionsRow: {
    alignItems: 'center',
    borderTopColor: '#F8FAFC',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  orderActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  orderActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  orderedStatusPill: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  orderedStatusText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
  },
  resetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  resetBtnText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '600',
  },
  deleteBtn: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  sugCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  sugTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  sugUser: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
  sugNoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  sugNoteText: {
    color: '#334155',
    fontSize: 10.5,
    fontStyle: 'italic',
  },
  addFromSugBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  addFromSugBtnText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 14,
    padding: 24,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 11.5,
    marginTop: 3,
    textAlign: 'center',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    maxHeight: '85%',
    maxWidth: 440,
    padding: 18,
    width: '100%',
    zIndex: 10,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 11,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  createBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 12,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
