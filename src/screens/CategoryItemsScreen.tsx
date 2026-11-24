import { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { CategoryImage } from '../components/CategoryImage';
import { ScreenContainer } from '../components/ScreenContainer';
import { StackScreenHeader } from '../components/StackScreenHeader';
import { getCategoryProducts } from '../data/categoryProducts';
import { getSectionItemsSync } from '../services/categoryService';
import { fetchProductsByCategory } from '../services/productService';
import { Product } from '../types/product';
import { getCategoryIconMeta, getProductIconMeta } from '../utils/itemIcons';
import { useGridColumns } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryItems'>;

export function CategoryItemsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { sectionId, sectionName } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [gridWidth, setGridWidth] = useState(0);
  const [categoryProducts, setCategoryProducts] = useState<Product[] | null>(() =>
    getCategoryProducts(sectionId),
  );
  const { columns, gap, padding } = useGridColumns({
    minItemWidth: 96,
    phoneColumns: 3,
    maxColumns: 6,
    gap: 10,
  });

  const itemWidth = useMemo(() => {
    if (gridWidth <= 0) {
      return 0;
    }
    return Math.floor((gridWidth - gap * (columns - 1)) / columns);
  }, [columns, gap, gridWidth]);

  const subCategories = useMemo(
    () => (categoryProducts ? [] : getSectionItemsSync(sectionId)),
    [sectionId, categoryProducts],
  );
  const isProductView = categoryProducts != null;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const local = getCategoryProducts(sectionId);
      if (!local) {
        setCategoryProducts(null);
        return () => {
          active = false;
        };
      }

      setCategoryProducts(local);
      fetchProductsByCategory(sectionId)
        .then(products => {
          if (active && products && products.length > 0) {
            setCategoryProducts(products);
          }
        })
        .catch(() => {
          if (active) {
            setCategoryProducts(local);
          }
        });

      return () => {
        active = false;
      };
    }, [sectionId]),
  );

  const filteredProducts = useMemo(() => {
    if (!categoryProducts) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryProducts;
    return categoryProducts.filter(
      product =>
        product.name.toLowerCase().includes(query) ||
        product.subtitle.toLowerCase().includes(query),
    );
  }, [categoryProducts, searchQuery]);

  const filteredSubCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return subCategories;
    return subCategories.filter(item => item.name.toLowerCase().includes(query));
  }, [subCategories, searchQuery]);

  const openProduct = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const onGridLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next > 0 && next !== gridWidth) {
      setGridWidth(next);
    }
  };

  return (
    <View style={styles.screen}>
      <StackScreenHeader
        shell="wide"
        title={sectionName}
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home', { activeTab: 'home' });
          }
        }}
      />

      <ScreenContainer width="wide" padding={padding} style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${sectionName}...`}
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </ScreenContainer>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>
        <ScreenContainer width="wide" padding={padding}>
          <View style={[styles.grid, { gap }]} onLayout={onGridLayout}>
            {isProductView ? (
              filteredProducts.length === 0 ? (
                <Text style={styles.empty}>No products found</Text>
              ) : itemWidth > 0 ? (
                filteredProducts.map(product => {
                  const iconMeta = getProductIconMeta(product, sectionId);
                  return (
                    <Pressable
                      key={product.id}
                      style={[styles.productCard, { width: itemWidth }]}
                      onPress={() => openProduct(product)}>
                      <View style={{ width: itemWidth, height: itemWidth }}>
                        <CategoryImage
                          image={product.image}
                          resizeMode="contain"
                          fitToCell={itemWidth}
                          style={{ width: itemWidth, height: itemWidth, borderRadius: 0 }}
                          iconSize={26}
                          iconName={iconMeta.icon}
                          iconColor={iconMeta.color}
                          iconBackgroundColor={iconMeta.backgroundColor}
                        />
                      </View>
                      <View style={styles.productBody}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={styles.productSub} numberOfLines={1}>
                          {product.subtitle}
                        </Text>
                        <View style={styles.productFooter}>
                          <Text style={styles.productPrice}>
                            ₹{product.price.toFixed(0)}
                            <Text style={styles.productUnit}>/{product.unit}</Text>
                          </Text>
                          <Pressable
                            style={styles.addBtn}
                            onPress={event => {
                              event.stopPropagation();
                              openProduct(product);
                            }}>
                            <Icon name="add" size={14} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              ) : null
            ) : filteredSubCategories.length === 0 ? (
              <Text style={styles.empty}>No items found</Text>
            ) : itemWidth > 0 ? (
              filteredSubCategories.map(item => {
                const iconMeta = getCategoryIconMeta(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.subCard, { width: itemWidth }]}
                    onPress={() =>
                      navigation.push('CategoryItems', {
                        sectionId: item.id,
                        sectionName: item.name,
                      })
                    }>
                    <View
                      style={[
                        styles.subImageWrap,
                        { width: itemWidth, height: itemWidth },
                      ]}>
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
                    <Text style={styles.subName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })
            ) : null}
          </View>
        </ScreenContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  searchWrap: {
    marginBottom: 12,
    marginTop: 12,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    color: '#1F2937',
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    paddingVertical: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  empty: {
    color: '#6B7280',
    marginTop: 64,
    textAlign: 'center',
    width: '100%',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  productBody: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  productName: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
  },
  productSub: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
  productFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  productPrice: {
    color: '#0A5C3E',
    fontSize: 11,
    fontWeight: '700',
  },
  productUnit: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '400',
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  subCard: {
    alignItems: 'center',
  },
  subImageWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  subName: {
    color: '#111827',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
