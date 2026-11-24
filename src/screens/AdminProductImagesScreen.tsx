import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import { CategoryImage } from '../components/CategoryImage';
import { StackScreenHeader } from '../components/StackScreenHeader';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { fetchAdminImageCatalog } from '../services/productImageService';
import { PriceCategorySlug, Product } from '../types/product';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useResponsiveLayout } from '../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdminProductImages'>;

const TABS: { id: PriceCategorySlug; label: string }[] = [
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruits', label: 'Fruits' },
];

function hasCustomImage(product: Product): boolean {
  return typeof product.image === 'string' && product.image.startsWith('http');
}

export function AdminProductImagesScreen() {
  const navigation = useNavigation<Nav>();
  const { shellStyle } = useResponsiveLayout();
  const [category, setCategory] = useState<PriceCategorySlug>('vegetables');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (nextCategory: PriceCategorySlug) => {
    setIsLoading(true);
    try {
      const rows = await fetchAdminImageCatalog(nextCategory);
      setProducts(rows);
    } catch (error) {
      Alert.alert(
        'Product images',
        getErrorMessage(
          error,
          'Could not load products. Run supabase/gfm_product_images.sql in Supabase.',
        ),
      );
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(category);
    }, [category, load]),
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      product =>
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  return (
    <View style={styles.root}>
      <StackScreenHeader
        title="Product images"
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.body, shellStyle('page')]}>
        <Text style={styles.hint}>
          Tap a product to set the main photo and three angle views (front, side, back).
        </Text>

        <View style={styles.tabs}>
          {TABS.map(tab => {
            const active = tab.id === category;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setCategory(tab.id)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchBox}>
          <Icon color={colors.textMuted} name="search" size={18} />
          <TextInput
            placeholder="Search products…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>No products match your search.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() =>
                  navigation.navigate('AdminProductImageEdit', { product: item })
                }>
                <CategoryImage
                  fitToCell={56}
                  image={item.image}
                  resizeMode="contain"
                  style={styles.thumb}
                />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {hasCustomImage(item)
                      ? 'Custom image uploaded'
                      : 'Using default / local image'}
                  </Text>
                </View>
                <Icon color={colors.textMuted} name="chevron-forward" size={18} />
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  tabs: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  thumb: {
    borderRadius: 10,
    height: 56,
    overflow: 'hidden',
    width: 56,
  },
  rowBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 40,
    textAlign: 'center',
  },
});
