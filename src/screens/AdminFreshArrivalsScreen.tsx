import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { AppStatusBar } from '../components/AppStatusBar';
import { RootStackParamList } from '../navigation/AppNavigator';
import { FreshArrivalItem, FreshArrivalPreset } from '../types/freshArrival';
import {
  createFreshArrival,
  deleteFreshArrival,
  fetchActiveFreshArrivals,
  formatArrivalClockTime,
  formatUploadedAgo,
  uploadArrivalPhoto,
} from '../services/freshArrivalsService';
import { FRESH_ARRIVAL_PRESETS } from '../data/fallbackFreshArrivals';
import { pickCategoryImage } from '../utils/pickCategoryImage';
import { getErrorMessage } from '../utils/errorMessage';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'AdminDashboard'>;

export function AdminFreshArrivalsScreen() {
  const navigation = useNavigation<Navigation>();
  const { isTablet, formMaxWidth, horizontalPadding } = useResponsiveLayout();

  const [arrivals, setArrivals] = useState<FreshArrivalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [selectedPresetId, setSelectedPresetId] = useState<string>('mangoes');
  const [title, setTitle] = useState('Fresh Alphonso Mangoes Arrived');
  const [subtitle, setSubtitle] = useState(
    'Directly from Ratnagiri orchards • Sweet, aromatic & 100% naturally ripened',
  );
  const [categoryTag, setCategoryTag] = useState('mangoes');
  const [categoryEmoji, setCategoryEmoji] = useState('🥭');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1553279768-865429fa0078?w=900&auto=format&fit=crop&q=80',
  );
  const [price, setPrice] = useState('299');
  const [unit, setUnit] = useState('dozen');
  const [stockLabel, setStockLabel] = useState('Limited 35 boxes available');
  const [badgeText, setBadgeText] = useState('LIVE • JUST ARRIVED');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const items = await fetchActiveFreshArrivals();
      setArrivals(items);
    } catch (err) {
      console.warn('[AdminFreshArrivals] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const applyPreset = (preset: FreshArrivalPreset) => {
    setSelectedPresetId(preset.id);
    setTitle(preset.title);
    setSubtitle(preset.subtitle);
    setCategoryTag(preset.categoryTag);
    setCategoryEmoji(preset.categoryEmoji);
    setPrice(String(preset.suggestedPrice));
    setUnit(preset.unit);
    setStockLabel(preset.stockQuantityLabel);
    setBadgeText(preset.badgeText);
    setImageUrl(preset.imageUrl);
  };

  const handlePickPhoto = async () => {
    setErrorMsg('');
    setIsUploadingPhoto(true);
    try {
      const picked = await pickCategoryImage();
      if (!picked) return;

      const publicUrl = await uploadArrivalPhoto(picked, categoryTag);
      setImageUrl(publicUrl);
      setSuccessMsg('Store photo uploaded successfully! 📸');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to upload photo.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePublishArrival = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!title.trim() || !imageUrl.trim()) {
      setErrorMsg('Please enter a title and provide a photo.');
      return;
    }

    setIsPublishing(true);
    try {
      await createFreshArrival({
        title: title.trim(),
        subtitle: subtitle.trim(),
        categoryTag: categoryTag.trim(),
        categoryEmoji: categoryEmoji.trim(),
        imageUrl: imageUrl.trim(),
        price: price ? Number(price) : undefined,
        unit: unit.trim(),
        stockQuantityLabel: stockLabel.trim(),
        badgeText: badgeText.trim(),
        arrivedAt: new Date().toISOString(),
      });

      setSuccessMsg('🔥 Published! Arrival is now LIVE on customer app.');
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to publish stock arrival.'));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteArrival = (id: string, itemTitle: string) => {
    Alert.alert(
      'Remove Live Story',
      `Are you sure you want to remove "${itemTitle}" from live arrivals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFreshArrival(id);
              setArrivals(prev => prev.filter(i => i.id !== id));
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err, 'Could not remove arrival post.'));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeRoot}>
      <AppStatusBar />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to Admin Dashboard"
            accessibilityRole="button"
            hitSlop={8}
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon color={colors.white} name="arrow-back" size={20} />
          </Pressable>
          <View className="flex-1 ml-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-bold text-white">Fresh Stock Arrivals</Text>
              <View style={styles.headerLiveBadge}>
                <Text style={styles.headerLiveText}>LIVE FEED</Text>
              </View>
            </View>
            <Text className="text-xs text-white/70">
              Post real-time photos when stock arrives at store
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && { alignItems: 'center', paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={[isTablet && { maxWidth: formMaxWidth, width: '100%' }]}>
            {/* Post Fresh Arrival Form Card */}
            <View style={styles.formCard}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2">
                  <View style={styles.fireIconWrap}>
                    <Text style={{ fontSize: 16 }}>🔥</Text>
                  </View>
                  <View>
                    <Text className="text-base font-bold text-slate-900">
                      Post Real-Time Arrival
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Appears instantly in top Instagram Stories
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Presets Carousel */}
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Quick Category Presets
              </Text>
              <ScrollView
                horizontal
                contentContainerStyle={styles.presetsScroll}
                showsHorizontalScrollIndicator={false}>
                {FRESH_ARRIVAL_PRESETS.map(preset => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      style={[
                        styles.presetChip,
                        isSelected && styles.presetChipActive,
                      ]}
                      onPress={() => applyPreset(preset)}>
                      <Text style={styles.presetEmoji}>{preset.categoryEmoji}</Text>
                      <Text
                        style={[
                          styles.presetLabel,
                          isSelected && styles.presetLabelActive,
                        ]}>
                        {preset.categoryTag.charAt(0).toUpperCase() + preset.categoryTag.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Photo Preview & Upload */}
              <View className="flex-row items-center justify-between mt-4 mb-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Stock Photo
                </Text>
                {imageUrl ? (
                  <View style={styles.fitToggleWrap}>
                    <Pressable
                      style={[
                        styles.fitToggleBtn,
                        fitMode === 'contain' && styles.fitToggleBtnActive,
                      ]}
                      onPress={() => setFitMode('contain')}>
                      <Icon
                        color={fitMode === 'contain' ? colors.primaryDark : '#64748B'}
                        name="contract-outline"
                        size={13}
                      />
                      <Text
                        style={[
                          styles.fitToggleText,
                          fitMode === 'contain' && styles.fitToggleTextActive,
                        ]}>
                        Zoom Out (Fit All)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.fitToggleBtn,
                        fitMode === 'cover' && styles.fitToggleBtnActive,
                      ]}
                      onPress={() => setFitMode('cover')}>
                      <Icon
                        color={fitMode === 'cover' ? colors.primaryDark : '#64748B'}
                        name="expand-outline"
                        size={13}
                      />
                      <Text
                        style={[
                          styles.fitToggleText,
                          fitMode === 'cover' && styles.fitToggleTextActive,
                        ]}>
                        Fill
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.photoContainer}>
                {imageUrl ? (
                  <>
                    {/* Ambient background so zoomed-out photo looks seamless */}
                    <Image
                      blurRadius={24}
                      resizeMode="cover"
                      source={{ uri: imageUrl }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.previewDarkScrim} />

                    {/* Foreground image rendered with selected fit mode */}
                    <Image
                      resizeMode={fitMode}
                      source={{ uri: imageUrl }}
                      style={styles.previewImage}
                    />

                    {/* Zoom mode badge indicator */}
                    <View style={styles.fitModeIndicator}>
                      <Icon
                        color="#FFFFFF"
                        name={fitMode === 'contain' ? 'contract-outline' : 'expand-outline'}
                        size={11}
                      />
                      <Text style={styles.fitModeIndicatorText}>
                        {fitMode === 'contain'
                          ? 'Zoomed Out • Full Photo Fitted'
                          : 'Filled Frame'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Icon color="#94A3B8" name="camera" size={32} />
                    <Text className="text-xs text-slate-400 mt-1">No photo chosen</Text>
                  </View>
                )}

                <View style={styles.photoActionButtons}>
                  <Pressable
                    disabled={isUploadingPhoto}
                    style={styles.uploadPhotoBtn}
                    onPress={handlePickPhoto}>
                    {isUploadingPhoto ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Icon color={colors.white} name="camera-outline" size={16} />
                        <Text style={styles.uploadPhotoBtnText}>Upload Photo</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Image URL Manual Input */}
              <Text className="text-[11px] text-slate-400 mt-2 mb-1">
                Or paste image URL directly:
              </Text>
              <TextInput
                autoCapitalize="none"
                placeholder="https://..."
                placeholderTextColor="#94A3B8"
                style={styles.inputField}
                value={imageUrl}
                onChangeText={setImageUrl}
              />

              {/* Title & Emoji */}
              <View className="flex-row items-center gap-2 mt-4">
                <View style={{ width: 56 }}>
                  <Text className="text-xs font-semibold text-slate-600 mb-1">Emoji</Text>
                  <TextInput
                    maxLength={3}
                    placeholder="🥭"
                    style={[styles.inputField, { textAlign: 'center', fontSize: 18 }]}
                    value={categoryEmoji}
                    onChangeText={setCategoryEmoji}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-600 mb-1">Headline Title</Text>
                  <TextInput
                    placeholder="e.g. Fresh Mangoes arrived at 8:30 AM"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>
              </View>

              {/* Subtitle / Notes */}
              <Text className="text-xs font-semibold text-slate-600 mt-3 mb-1">
                Description / Farm Origin
              </Text>
              <TextInput
                multiline
                numberOfLines={2}
                placeholder="e.g. Directly from Ratnagiri orchards • Sweet & aromatic"
                placeholderTextColor="#94A3B8"
                style={[styles.inputField, { minHeight: 48, textAlignVertical: 'top' }]}
                value={subtitle}
                onChangeText={setSubtitle}
              />

              {/* Price, Unit & Urgency Row */}
              <View className="flex-row items-center gap-2 mt-3">
                <View style={{ flex: 1.2 }}>
                  <Text className="text-xs font-semibold text-slate-600 mb-1">Arrival Price (₹)</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="299"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-xs font-semibold text-slate-600 mb-1">Unit</Text>
                  <TextInput
                    placeholder="dozen, kg, 500g"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
                <View style={{ flex: 1.8 }}>
                  <Text className="text-xs font-semibold text-slate-600 mb-1">Stock Note</Text>
                  <TextInput
                    placeholder="Limited 20 kg"
                    placeholderTextColor="#94A3B8"
                    style={styles.inputField}
                    value={stockLabel}
                    onChangeText={setStockLabel}
                  />
                </View>
              </View>

              {/* Error / Success Feedback */}
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Icon color="#DC2626" name="alert-circle" size={16} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {successMsg ? (
                <View style={styles.successBanner}>
                  <Icon color="#059669" name="checkmark-circle" size={16} />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}

              {/* Publish Button */}
              <Pressable
                accessibilityRole="button"
                disabled={isPublishing}
                style={[styles.publishButton, isPublishing && { opacity: 0.8 }]}
                onPress={handlePublishArrival}>
                {isPublishing ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Icon color={colors.white} name="paper-plane" size={18} />
                    <Text style={styles.publishButtonText}>
                      Publish to Real-Time Feed 🚀
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Currently Active Live Arrivals List */}
            <View style={styles.listSection}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View style={styles.liveGreenDot} />
                  <Text className="text-base font-bold text-slate-900">
                    Active Live Stories ({arrivals.length})
                  </Text>
                </View>
                <Pressable onPress={loadData}>
                  <Icon color={colors.primary} name="refresh" size={18} />
                </Pressable>
              </View>

              {isLoading ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : arrivals.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text className="text-sm font-semibold text-slate-600">
                    No active stock arrivals.
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    Upload a photo above to broadcast today's arrivals to customers!
                  </Text>
                </View>
              ) : (
                arrivals.map(item => (
                  <View key={item.id} style={styles.arrivalCard}>
                    <Image
                      resizeMode="cover"
                      source={{ uri: item.imageUrl }}
                      style={styles.arrivalThumb}
                    />
                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center gap-1.5">
                        <Text style={{ fontSize: 14 }}>{item.categoryEmoji}</Text>
                        <Text numberOfLines={1} style={styles.arrivalCardTitle}>
                          {item.title}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={styles.arrivalCardSub}>
                        {item.subtitle}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text style={styles.arrivalPriceTag}>
                          ₹{item.price ?? 99}/{item.unit || 'pack'}
                        </Text>
                        <Text style={styles.arrivalTimestamp}>
                          • {formatUploadedAgo(item.arrivedAt)} ({formatArrivalClockTime(item.arrivedAt)})
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityLabel={`Delete arrival ${item.title}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      style={styles.deleteButton}
                      onPress={() => handleDeleteArrival(item.id, item.title)}>
                      <Icon color="#EF4444" name="trash-outline" size={18} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    backgroundColor: colors.primaryDark,
    flex: 1,
  },
  keyboardWrap: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerLiveBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  headerLiveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  fireIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  presetChip: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  presetChipActive: {
    backgroundColor: '#ECFDF3',
    borderColor: colors.primary,
  },
  presetEmoji: {
    fontSize: 14,
  },
  presetLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  presetLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  fitToggleWrap: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  fitToggleBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fitToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  fitToggleText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  fitToggleTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  photoContainer: {
    backgroundColor: '#0F172A',
    borderColor: '#CBD5E1',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 170,
    overflow: 'hidden',
    position: 'relative',
  },
  previewDarkScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  fitModeIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    position: 'absolute',
    top: 8,
  },
  fitModeIndicatorText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  photoPlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  photoActionButtons: {
    bottom: 10,
    position: 'absolute',
    right: 10,
  },
  uploadPhotoBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadPhotoBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    color: '#DC2626',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#A7F3D0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  successText: {
    color: '#059669',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  publishButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    elevation: 4,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  publishButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  listSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  liveGreenDot: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  arrivalCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  arrivalThumb: {
    borderRadius: 12,
    height: 58,
    width: 58,
  },
  arrivalCardTitle: {
    color: '#0F172A',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  arrivalCardSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  arrivalPriceTag: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  arrivalTimestamp: {
    color: '#94A3B8',
    fontSize: 10,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 8,
  },
});
