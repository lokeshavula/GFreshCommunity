import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryImage } from '../components/CategoryImage';
import { StackScreenHeader } from '../components/StackScreenHeader';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  fetchProductImageSet,
  saveProductImages,
  uploadAndAssignProductSlot,
} from '../services/productImageService';
import { ProductImageSet } from '../types/product';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useResponsiveLayout } from '../utils/layout';
import { pickCategoryImage } from '../utils/pickCategoryImage';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminProductImageEdit'>;

type SlotKey = keyof ProductImageSet;

const ANGLE_SLOTS: { key: Exclude<SlotKey, 'main'>; label: string; hint: string }[] = [
  { key: 'front', label: 'Front', hint: 'Front angle' },
  { key: 'side', label: 'Side', hint: 'Side angle' },
  { key: 'back', label: 'Back', hint: 'Back / other angle' },
];

function emptySet(): ProductImageSet {
  return { main: null, front: null, side: null, back: null };
}

function previewFor(slot: SlotKey, images: ProductImageSet, fallback: string | number | null) {
  if (slot === 'main') {
    return images.main ?? fallback;
  }
  return images[slot] ?? images.main ?? fallback;
}

export function AdminProductImageEditScreen({ navigation, route }: Props) {
  const { product } = route.params;
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();
  const [images, setImages] = useState<ProductImageSet>(emptySet());
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<SlotKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const set = await fetchProductImageSet(product.id);
      setImages(set);
    } catch (error) {
      Alert.alert(
        'Images',
        getErrorMessage(error, 'Could not load saved images for this product.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    load();
  }, [load]);

  const pickSlot = async (slot: SlotKey) => {
    if (uploadingSlot || isSaving) {
      return;
    }

    try {
      const picked = await pickCategoryImage();
      if (!picked) {
        return;
      }

      setUploadingSlot(slot);
      const next = await uploadAndAssignProductSlot(product, slot, picked, images);
      setImages(next);
    } catch (error) {
      Alert.alert('Upload', getErrorMessage(error, 'Could not upload image.'));
    } finally {
      setUploadingSlot(null);
    }
  };

  const clearSlot = (slot: SlotKey) => {
    setImages(prev => ({ ...prev, [slot]: null }));
  };

  const onSave = async () => {
    if (isSaving || uploadingSlot) {
      return;
    }

    setIsSaving(true);
    try {
      await saveProductImages(product, images);
      Alert.alert('Saved', 'Product images updated. They will show on shop pages.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(
        'Save failed',
        getErrorMessage(
          error,
          'Could not save. Run supabase/gfm_product_images.sql (and fix_storage_bucket.sql if needed).',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const mainPreview = previewFor('main', images, product.image);

  return (
    <View style={styles.root}>
      <StackScreenHeader title={product.name} onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            shellStyle('page'),
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Main product image</Text>
          <Text style={styles.sectionHint}>
            Shown on lists, home, and category pages.
          </Text>

          <Pressable style={styles.mainCard} onPress={() => pickSlot('main')}>
            {uploadingSlot === 'main' ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <CategoryImage
                image={mainPreview}
                resizeMode="contain"
                style={styles.mainImage}
              />
            )}
            <View style={styles.mainOverlay}>
              <Icon color={colors.white} name="camera" size={18} />
              <Text style={styles.mainOverlayText}>
                {images.main ? 'Change main photo' : 'Upload main photo'}
              </Text>
            </View>
          </Pressable>

          {images.main ? (
            <Pressable style={styles.clearLink} onPress={() => clearSlot('main')}>
              <Text style={styles.clearLinkText}>Remove main photo</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.sectionLabel, styles.sectionSpacer]}>Angle views</Text>
          <Text style={styles.sectionHint}>
            Three photos for the product detail gallery (front, side, back).
          </Text>

          <View style={styles.angleRow}>
            {ANGLE_SLOTS.map(slot => {
              const preview = previewFor(slot.key, images, product.image);
              const busy = uploadingSlot === slot.key;
              const hasRemote = Boolean(images[slot.key]);

              return (
                <View key={slot.key} style={styles.angleCol}>
                  <Pressable style={styles.angleCard} onPress={() => pickSlot(slot.key)}>
                    {busy ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <CategoryImage
                        image={preview}
                        resizeMode="contain"
                        style={styles.angleImage}
                      />
                    )}
                    <View style={styles.angleBadge}>
                      <Icon color={colors.white} name="add" size={14} />
                    </View>
                  </Pressable>
                  <Text style={styles.angleLabel}>{slot.label}</Text>
                  <Text style={styles.angleHint}>{slot.hint}</Text>
                  {hasRemote ? (
                    <Pressable onPress={() => clearSlot(slot.key)}>
                      <Text style={styles.clearSmall}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Pressable
            disabled={isSaving || uploadingSlot != null}
            style={[
              styles.saveButton,
              (isSaving || uploadingSlot != null) && styles.saveButtonDisabled,
            ]}
            onPress={onSave}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon color={colors.white} name="checkmark-circle" size={20} />
                <Text style={styles.saveText}>Save images</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSpacer: {
    marginTop: 28,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: 4,
  },
  mainCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    height: 220,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainImage: {
    height: '100%',
    width: '100%',
  },
  mainOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(6, 61, 41, 0.78)',
    borderRadius: 999,
    bottom: 14,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
  },
  mainOverlayText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  clearLink: {
    alignSelf: 'center',
    marginTop: 10,
    padding: 6,
  },
  clearLinkText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  angleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  angleCol: {
    flex: 1,
  },
  angleCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 112,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  angleImage: {
    height: '100%',
    width: '100%',
  },
  angleBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 8,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    width: 24,
  },
  angleLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  angleHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  clearSmall: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 28,
    paddingVertical: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
