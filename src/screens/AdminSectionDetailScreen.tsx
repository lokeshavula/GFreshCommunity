import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { CategoryImage } from '../components/CategoryImage';
import { deleteCategory, fetchSectionItems } from '../services/categoryService';
import { CategoryItem } from '../types/category';
import { getCategoryIconMeta, getProductIconMeta } from '../utils/itemIcons';
import { getErrorMessage } from '../utils/errorMessage';
import { colors } from '../theme/colors';
import { useCenteredContentStyle, useResponsiveLayout } from '../utils/layout';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'AdminSectionDetail'>;
type ScreenRoute = RouteProp<RootStackParamList, 'AdminSectionDetail'>;

export function AdminSectionDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { sectionId, sectionName } = route.params;
  const { shellStyle } = useResponsiveLayout();
  const contentStyle = useCenteredContentStyle({
    width: 'page',
    paddingBottom: 32,
  });

  const [items, setItems] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchSectionItems(sectionId);
      setItems(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load items.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [sectionId]),
  );

  const confirmDeleteItem = (item: CategoryItem) => {
    Alert.alert('Delete item?', `Remove "${item.name}" from ${sectionName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteItem(item.id),
      },
    ]);
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingId(itemId);
    setErrorMessage('');
    try {
      await deleteCategory(itemId);
      setItems(current => current.filter(item => item.id !== itemId));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to delete item.'));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteSection = () => {
    const itemNote =
      items.length > 0 ? `\n\nThis will also delete all ${items.length} item(s) inside.` : '';

    Alert.alert(
      'Delete section?',
      `Remove "${sectionName}" and everything inside it?${itemNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete section',
          style: 'destructive',
          onPress: handleDeleteSection,
        },
      ],
    );
  };

  const handleDeleteSection = async () => {
    setIsDeletingSection(true);
    setErrorMessage('');
    try {
      await deleteCategory(sectionId);
      navigation.goBack();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to delete section.'));
      setIsDeletingSection(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center py-4" style={shellStyle('page')}>
          <Pressable className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white" onPress={() => navigation.goBack()}>
            <Icon color={colors.textPrimary} name="chevron-back" size={24} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-slate-900">{sectionName}</Text>
            <Text className="text-sm text-slate-500">{items.length} items available</Text>
          </View>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-red-50"
            disabled={isDeletingSection}
            onPress={confirmDeleteSection}>
            {isDeletingSection ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <Icon color={colors.danger} name="trash-outline" size={22} />
            )}
          </Pressable>
        </View>

        <View style={shellStyle('page')}>
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4"
            onPress={() => navigation.navigate('AdminAddCategoryItem', { sectionId, sectionName })}>
            <Icon color={colors.white} name="add-circle-outline" size={22} />
            <Text className="text-base font-bold text-white">Add item to {sectionName}</Text>
          </Pressable>
        </View>

        <ScrollView
          className="mt-5 flex-1"
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}>
          {errorMessage ? <Text className="mb-3 text-sm text-red-500">{errorMessage}</Text> : null}

          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : items.length === 0 ? (
            <Text className="text-sm text-slate-500">No items yet. Add Apple, Mango, etc.</Text>
          ) : (
            items.map(item => {
              const iconMeta = item.price != null
                ? getProductIconMeta(item, sectionId)
                : getCategoryIconMeta(item.id);
              return (
              <View key={item.id} className="mb-3 flex-row items-center rounded-2xl bg-white p-3" style={styles.card}>
                <CategoryImage
                  image={item.image}
                  style={styles.thumbnail}
                  iconSize={22}
                  iconName={iconMeta.icon}
                  iconColor={iconMeta.color}
                  iconBackgroundColor={iconMeta.backgroundColor}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
                  {item.price != null ? (
                    <Text className="mt-1 text-sm text-primary">₹{item.price.toFixed(2)}</Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="h-10 w-10 items-center justify-center rounded-full bg-red-50"
                  disabled={deletingId === item.id}
                  onPress={() => confirmDeleteItem(item)}>
                  {deletingId === item.id ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <Icon color={colors.danger} name="trash-outline" size={20} />
                  )}
                </Pressable>
              </View>
            );})
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  thumbnail: { borderRadius: 12, height: 56, width: 56 },
});
