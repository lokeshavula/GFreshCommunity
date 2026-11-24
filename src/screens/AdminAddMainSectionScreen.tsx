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
import { useCategoryImagePicker } from '../hooks/useCategoryImagePicker';
import { createMainSection } from '../services/categoryService';
import { uploadCategoryImage } from '../services/storageService';
import { getErrorMessage } from '../utils/errorMessage';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'AdminAddMainSection'>;

export function AdminAddMainSectionScreen() {
  const navigation = useNavigation<Navigation>();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingTop: 8,
    paddingBottom: 32,
  });
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { pickedImage, previewUri, imageUrlInput, setImageUrlInput, pickError, pickImage, getResolvedImageUrl } =
    useCategoryImagePicker();

  const handleSave = async () => {
    setErrorMessage('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Main section name is required.');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl: string | null = null;
      imageUrl = await getResolvedImageUrl(uploadCategoryImage);

      await createMainSection({ name: trimmedName, imageUrl });
      navigation.navigate('AdminDashboard');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to save main section.'));
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
              <View className="flex-1">
                <Text className="text-2xl font-bold text-slate-900">Add Main Section</Text>
                <Text className="mt-1 text-sm text-slate-500">Step 1 of 2 — then add items inside the section</Text>
              </View>
            </View>

            <View>
              <Text className="mb-1 text-sm text-slate-500">Example: Fruits, Vegetables, Drinks</Text>
              <Text className="mb-2 text-sm font-medium text-slate-600">Main section name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="e.g. Fruits"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <Text className="mb-2 mt-4 text-sm font-medium text-slate-600">Section image (optional)</Text>
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
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={imageUrlInput}
                  onChangeText={setImageUrlInput}
                />
              </View>

              {errorMessage ? <Text className="mt-4 text-sm text-red-500">{errorMessage}</Text> : null}

              <Pressable className="mt-6 items-center rounded-2xl bg-primary py-4" disabled={isSaving} onPress={handleSave}>
                {isSaving ? <ActivityIndicator color={colors.white} /> : <Text className="text-base font-bold text-white">Save Main Section</Text>}
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
