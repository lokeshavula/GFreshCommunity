import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CategoryImage } from '../components/CategoryImage';
import { ScreenContainer } from '../components/ScreenContainer';
import { StackScreenHeader } from '../components/StackScreenHeader';
import { FALLBACK_CATEGORY_SECTIONS } from '../data/fallbackCategories';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getCategoryIconMeta } from '../utils/itemIcons';
import { useGridColumns } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Categories'>;

export function CategoriesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const categorySections = FALLBACK_CATEGORY_SECTIONS;
  const { columns: _columns, itemWidth, gap, padding } = useGridColumns({
    minItemWidth: 84,
    phoneColumns: 4,
    maxColumns: 8,
    gap: 10,
  });

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return categorySections;
    }

    return categorySections
      .filter(
        section =>
          section.title.toLowerCase().includes(query) ||
          section.items.some(item => item.name.toLowerCase().includes(query)),
      )
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.name.toLowerCase().includes(query)),
      }));
  }, [searchQuery, categorySections]);

  const openCategory = (itemId: string, itemName: string) => {
    navigation.navigate('CategoryItems', {
      sectionId: itemId,
      sectionName: itemName,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StackScreenHeader
        shell="wide"
        title="See All categories"
        onBack={() => navigation.goBack()}
      />

      <ScreenContainer width="wide" padding={padding} style={{ marginBottom: 20 }}>
        <View
          className="flex-row items-center bg-white rounded-full px-4 py-3.5"
          style={styles.searchBar}
        >
          <Icon name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-base text-gray-800"
            placeholder="Search ...."
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </ScreenContainer>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer width="wide" padding={padding}>
          {filteredSections.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Icon name="search-outline" size={40} color="#9CA3AF" />
              <Text className="text-base text-gray-500 mt-3">No categories found</Text>
            </View>
          ) : (
            filteredSections.map(section => (
              <View key={section.id} className="mb-8">
                <Pressable
                  className="flex-row items-center justify-between mb-4"
                  onPress={() =>
                    navigation.navigate('CategoryItems', {
                      sectionId: section.id,
                      sectionName: section.title,
                    })
                  }>
                  <Text className="text-lg font-bold text-gray-900">{section.title}</Text>
                  <Text className="text-sm text-primary">See all →</Text>
                </Pressable>

                <View className="flex-row flex-wrap" style={{ gap }}>
                  {section.items.map(item => {
                    const iconMeta = getCategoryIconMeta(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        className="items-center"
                        style={{ width: itemWidth }}
                        onPress={() => openCategory(item.id, item.name)}
                      >
                        <View
                          className="rounded-2xl overflow-hidden bg-white"
                          style={[styles.categoryCard, { width: itemWidth, height: itemWidth }]}
                        >
                          <CategoryImage
                            image={item.image}
                            resizeMode="contain"
                            fitToCell={itemWidth}
                            style={{ width: itemWidth, height: itemWidth, borderRadius: 16 }}
                            iconSize={24}
                            iconName={iconMeta.icon}
                            iconColor={iconMeta.color}
                            iconBackgroundColor={iconMeta.backgroundColor}
                          />
                        </View>
                        <Text
                          className="text-xs text-gray-900 text-center mt-2 leading-4"
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScreenContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
