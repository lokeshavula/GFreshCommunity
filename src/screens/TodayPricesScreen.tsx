import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { CategoryImage } from '../components/CategoryImage';
import { StackScreenHeader } from '../components/StackScreenHeader';
import { fetchTodayProducePrices } from '../services/productService';
import { PriceCategorySlug, Product } from '../types/product';
import { colors } from '../theme/colors';
import { getProductIconMeta } from '../utils/itemIcons';
import { formatPriceDateLong, toPriceDateKey } from '../utils/priceDate';
import { useResponsiveLayout } from '../utils/layout';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TodayPrices'>;

const TABS: { id: PriceCategorySlug; label: string }[] = [
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruits', label: 'Fruits' },
];

export function TodayPricesScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();
  const [category, setCategory] = useState<PriceCategorySlug>('vegetables');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const todayKey = toPriceDateKey();

  const load = useCallback(async (nextCategory: PriceCategorySlug) => {
    setIsLoading(true);
    try {
      const rows = await fetchTodayProducePrices(nextCategory);
      setProducts(rows);
    } catch {
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
    return products.filter(product => product.name.toLowerCase().includes(query));
  }, [products, searchQuery]);

  return (
    <View className="flex-1 bg-white">
      <StackScreenHeader
        shell="wide"
        title="Today's prices"
        onBack={() => navigation.goBack()}
      />
      <View style={[{ paddingTop: 8, paddingBottom: 12 }, shellStyle('wide')]}>
        <Text className="mb-3 text-center text-xs text-slate-500">
          {formatPriceDateLong(todayKey)}
        </Text>

        <View className="flex-row gap-2 px-1">
          {TABS.map(tab => {
            const selected = tab.id === category;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setCategory(tab.id)}
                style={[styles.tab, selected && styles.tabSelected]}>
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-3 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Icon color="#94A3B8" name="search-outline" size={18} />
          <TextInput
            className="ml-2 flex-1 text-base text-slate-800"
            placeholder={`Search ${category}...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 16,
            paddingTop: 12,
          }}
          ListEmptyComponent={
            <Text className="mt-16 text-center text-slate-500">
              No prices listed for today yet
            </Text>
          }
          renderItem={({ item }) => {
            const iconMeta = getProductIconMeta(item);
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                <CategoryImage
                  image={item.image}
                  resizeMode="contain"
                  fitToCell={56}
                  style={styles.thumb}
                  iconSize={22}
                  iconName={iconMeta.icon}
                  iconColor={iconMeta.color}
                  iconBackgroundColor={iconMeta.backgroundColor}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500">Per {item.unit}</Text>
                </View>
                <View className="items-end">
                  <Text style={styles.price}>₹{item.price.toFixed(0)}</Text>
                  <Text className="mt-0.5 text-[10px] font-semibold text-slate-400">
                    /{item.unit}
                  </Text>
                </View>
                <Icon color="#CBD5E1" name="chevron-forward" size={16} style={{ marginLeft: 6 }} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextSelected: {
    color: colors.white,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  thumb: {
    borderRadius: 12,
    height: 56,
    overflow: 'hidden',
    width: 56,
  },
  price: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
});
