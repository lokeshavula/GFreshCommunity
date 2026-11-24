import { useEffect, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { useCategoryImagePicker } from '../hooks/useCategoryImagePicker';
import { createCategoryItem } from '../services/categoryService';
import { uploadCategoryImage } from '../services/storageService';
import { getErrorMessage } from '../utils/errorMessage';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'AdminAddCategoryItem'>;
type ScreenRoute = RouteProp<RootStackParamList, 'AdminAddCategoryItem'>;

export function AdminAddCategoryItemScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { sectionId, sectionName } = route.params;
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingTop: 8,
    paddingBottom: 32,
  });

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { previewUri, imageUrlInput, setImageUrlInput, pickError, pickImage, getResolvedImageUrl } =
    useCategoryImagePicker();

  useEffect(() => {
    if (!sectionId) {
      navigation.goBack();
    }
  }, [navigation, sectionId]);

  const handleSave = async () => {
    setErrorMessage('');
    const trimmedName = name.trim();
    const parsedPrice = Number(price);

    if (!trimmedName) {
      setErrorMessage('Item name is required.');
      return;
    }
    if (!price.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage('Enter a valid price greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl: string | null = null;
      imageUrl = await getResolvedImageUrl(uploadCategoryImage);

      await createCategoryItem({
        parentId: sectionId,
        name: trimmedName,
        price: parsedPrice,
        imageUrl,
      });

      navigation.navigate('AdminSectionDetail', { sectionId, sectionName });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to save item.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center py-4">
              <Pressable className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white" onPress={() => navigation.goBack()}>
                <Icon color={colors.textPrimary} name="chevron-back" size={24} />
              </Pressable>
              <View>
                <Text className="text-2xl font-bold text-slate-900">Add Item</Text>
                <Text className="text-sm text-slate-500">Under: {sectionName}</Text>
              </View>
            </View>

            <View>
              <Text className="mb-1 text-sm text-slate-500">Example under Fruits: Apple, Mango, Grapes</Text>
              <Text className="mb-2 text-sm font-medium text-slate-600">Item name</Text>
              <View style={styles.inputWrapper}>
                <TextInput placeholder="e.g. Apple" placeholderTextColor="#94A3B8" style={styles.input} value={name} onChangeText={setName} />
              </View>

              <Text className="mb-2 mt-4 text-sm font-medium text-slate-600">Price (₹)</Text>
              <View style={styles.inputWrapper}>
                <TextInput keyboardType="decimal-pad" placeholder="50.00" placeholderTextColor="#94A3B8" style={styles.input} value={price} onChangeText={setPrice} />
              </View>

              <Text className="mb-2 mt-4 text-sm font-medium text-slate-600">Item image</Text>
              <Pressable className="items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-8" onPress={pickImage}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
                ) : (
                  <>
                    <Icon color={colors.primaryLight} name="cloud-upload-outline" size={36} />
                    <Text className="mt-2 text-sm text-slate-500">Tap to upload image</Text>
                  </>
                )}
              </Pressable>

              {pickError ? <Text className="mt-2 text-sm text-red-500">{pickError}</Text> : null}

              <Text className="mb-2 mt-4 text-sm font-medium text-slate-600">Or paste image URL</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://example.com/apple.jpg"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={imageUrlInput}
                  onChangeText={setImageUrlInput}
                />
              </View>

              {errorMessage ? <Text className="mt-4 text-sm text-red-500">{errorMessage}</Text> : null}

              <Pressable className="mt-6 items-center rounded-2xl bg-primary py-4" disabled={isSaving} onPress={handleSave}>
                {isSaving ? <ActivityIndicator color={colors.white} /> : <Text className="text-base font-bold text-white">Save Item</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { color: '#0F172A', flex: 1, fontSize: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  inputWrapper: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  preview: { borderRadius: 16, height: 160, width: 160 },
});
