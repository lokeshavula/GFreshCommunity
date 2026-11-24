import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CategoryImage } from '../components/CategoryImage';
import {
  addToCart,
  fetchCartCount,
  getCartItemByProductId,
  updateCartItemQuantity,
} from '../services/cartService';
import { isProductFavourite, toggleFavourite } from '../services/favouriteService';
import { fetchProductById, fetchRelatedProducts } from '../services/productService';
import { getCurrentUser } from '../services/userService';
import { CartItem } from '../types/cart';
import { Product } from '../types/product';
import { getProductGalleryImages } from '../utils/detailImages';
import { getErrorMessage } from '../utils/errorMessage';
import { getImageSource } from '../utils/imageSource';
import { getProductIconMeta } from '../utils/itemIcons';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const HIGHLIGHTS = [
  'Handpicked fresh quality from trusted farms',
  'Hygienically packed for safe home delivery',
  'Best before date printed on every pack',
  'Quality checked before dispatch',
];

const DELIVERY_INFO = [
  { icon: 'bicycle-outline', title: 'Free delivery', subtitle: 'On orders above ₹199' },
  { icon: 'time-outline', title: 'Delivery in 30 min', subtitle: 'Express slots available' },
  { icon: 'shield-checkmark-outline', title: 'Easy returns', subtitle: 'If quality is not satisfied' },
];

const DETAIL_ROWS = (product: Product) => [
  { label: 'Unit', value: `Per ${product.unit}` },
  { label: 'Net quantity', value: product.unit === 'kg' ? '1 kg pack' : `1 ${product.unit}` },
  { label: 'Brand', value: 'G-Fresh Select' },
  { label: 'Country of origin', value: 'India' },
  { label: 'Storage', value: 'Keep refrigerated after opening' },
  { label: 'Shelf life', value: 'Best consumed within 5 days' },
  { label: 'Availability', value: 'In Stock', highlight: true },
];

const REVIEW_TAGS = ['Fresh', 'Good quality', 'Value for money', 'Fast delivery'];

function InfoChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.infoChip}>
      <Icon color={colors.primary} name={icon} size={14} />
      <Text className="ml-1.5 text-sm font-semibold text-slate-700">{label}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text className="mb-3 text-sm font-bold text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function RelatedProductCard({
  product,
  onPress,
  onAdd,
}: {
  product: Product;
  onPress: () => void;
  onAdd: (product: Product, event?: any) => void;
}) {
  const mrp = Math.round(product.price * 1.18);
  const discount = Math.max(Math.round(((mrp - product.price) / mrp) * 100), 8);
  const iconMeta = getProductIconMeta(product);

  return (
    <Pressable style={styles.relatedCard} onPress={onPress}>
      <View style={styles.relatedImageWrap}>
        {product.image != null ? (
          <Image
            fadeDuration={0}
            resizeMode="contain"
            source={getImageSource(product.image)}
            style={styles.relatedImage}
          />
        ) : (
          <Icon color={iconMeta.color} name={iconMeta.icon} size={28} />
        )}
        <View style={styles.relatedOffer}>
          <Text style={styles.relatedOfferText}>{discount}% OFF</Text>
        </View>
      </View>

      <Text style={styles.relatedName} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.relatedUnit} numberOfLines={1}>
        {product.unit}
      </Text>

      <View style={styles.relatedFooter}>
        <View>
          <Text style={styles.relatedPrice}>₹{product.price.toFixed(0)}</Text>
          <Text style={styles.relatedMrp}>₹{mrp}</Text>
        </View>
        <Pressable
          accessibilityLabel={`Add ${product.name} to cart`}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.relatedAdd}
          onPress={e => {
            e.stopPropagation();
            onAdd(product, e);
          }}>
          <Icon color={colors.primary} name="add" size={18} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export function ProductDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();
  const [product, setProduct] = useState<Product>(route.params.product);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isTogglingFavourite, setIsTogglingFavourite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedItems, setRelatedItems] = useState<Product[]>([]);

  // Cart quantity & status state
  const [cartItem, setCartItem] = useState<CartItem | null>(null);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [totalCartCount, setTotalCartCount] = useState(0);
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [cartIconPosition, setCartIconPosition] = useState<{ x: number; y: number } | null>(null);

  // Animation values
  const heartScale = useSharedValue(1);
  const cartBadgeScale = useSharedValue(1);
  const qtyScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  const flyingAnimX = useSharedValue(0);
  const flyingAnimY = useSharedValue(0);
  const flyingAnimScale = useSharedValue(0);
  const flyingAnimOpacity = useSharedValue(0);
  const flyingAnimRotate = useSharedValue(0);

  const productIconMeta = useMemo(() => getProductIconMeta(product), [product]);

  const gallerySources = useMemo((): Array<ImageSourcePropType | null> => {
    return getProductGalleryImages(product).map(item =>
      item != null ? (getImageSource(item) as ImageSourcePropType) : null,
    );
  }, [product]);

  const activeSource = gallerySources[selectedImageIndex] ?? gallerySources[0];

  const mrp = useMemo(() => Math.round(product.price * 1.18), [product.price]);
  const discount = useMemo(
    () => Math.max(Math.round(((mrp - product.price) / mrp) * 100), 8),
    [mrp, product.price],
  );

  const loadCartState = useCallback(async () => {
    try {
      const [existingItem, count] = await Promise.all([
        getCartItemByProductId(product.id),
        fetchCartCount(),
      ]);
      setCartItem(existingItem);
      setCartQuantity(existingItem?.quantity ?? 0);
      setTotalCartCount(count);
    } catch {
      // ignore
    }
  }, [product.id]);

  useEffect(() => {
    setProduct(route.params.product);
    setSelectedImageIndex(0);
  }, [route.params.product]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchProductById(route.params.product.id).then(fresh => {
        if (active && fresh) {
          setProduct(fresh);
        }
      });
      isProductFavourite(route.params.product.id).then(value => {
        if (active) {
          setIsFavourite(value);
        }
      });
      loadCartState();
      return () => {
        active = false;
      };
    }, [route.params.product.id, loadCartState]),
  );

  useEffect(() => {
    let isMounted = true;

    fetchRelatedProducts(product.id).then(items => {
      if (isMounted) {
        setRelatedItems(items.slice(0, 4));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [product.id]);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const cartBadgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartBadgeScale.value }],
  }));

  const qtyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const flyingAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: flyingAnimX.value,
    top: flyingAnimY.value,
    transform: [
      { scale: flyingAnimScale.value },
      { rotate: `${flyingAnimRotate.value}deg` },
    ],
    opacity: flyingAnimOpacity.value,
    zIndex: 9999,
  }));

  const triggerFlyToCartAnimation = useCallback(
    (startCoords?: { x: number; y: number }) => {
      const { width: winWidth, height: winHeight } = Dimensions.get('window');

      // Responsive launch position (exact touch point or bottom action bar)
      const startX =
        startCoords?.x != null ? startCoords.x - 22 : winWidth / 2 + 40;
      const startY =
        startCoords?.y != null
          ? startCoords.y - 22
          : winHeight - insets.bottom - 48;

      // Responsive target destination (measured from Header Cart button)
      const targetX =
        cartIconPosition?.x ?? (winWidth - insets.right - 44);
      const targetY = cartIconPosition?.y ?? (insets.top + 16);

      flyingAnimX.value = startX;
      flyingAnimY.value = startY;
      flyingAnimScale.value = 0.4;
      flyingAnimRotate.value = -12;
      flyingAnimOpacity.value = 1;

      // Elastic launch pop + smooth scaling towards cart
      flyingAnimScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 260 }),
        withTiming(0.2, { duration: 420, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      );

      flyingAnimRotate.value = withTiming(360, {
        duration: 620,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      flyingAnimX.value = withTiming(targetX, {
        duration: 620,
        easing: Easing.bezier(0.22, 0.85, 0.25, 1),
      });

      flyingAnimY.value = withTiming(
        targetY,
        {
          duration: 620,
          easing: Easing.bezier(0.32, 0.95, 0.2, 1),
        },
        finished => {
          if (finished) {
            flyingAnimOpacity.value = 0;
            cartBadgeScale.value = withSequence(
              withSpring(1.7, { damping: 4, stiffness: 350 }),
              withSpring(1, { damping: 8, stiffness: 220 }),
            );
          }
        },
      );
    },
    [
      cartIconPosition,
      cartBadgeScale,
      flyingAnimOpacity,
      flyingAnimRotate,
      flyingAnimScale,
      flyingAnimX,
      flyingAnimY,
      insets.bottom,
      insets.right,
      insets.top,
    ],
  );

  const handleFavouritePress = async () => {
    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to save favourites.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    if (isTogglingFavourite) {
      return;
    }

    setIsTogglingFavourite(true);
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 250 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );

    try {
      const result = await toggleFavourite({
        productId: product.id,
        name: product.name,
        subtitle: product.subtitle,
        price: product.price,
        unit: product.unit,
        image: product.image,
      });
      setIsFavourite(result.isFavourite);
    } catch (error) {
      Alert.alert('Favourites', getErrorMessage(error, 'Could not update favourite.'));
    } finally {
      setIsTogglingFavourite(false);
    }
  };

  const handleAddToCart = async (e?: any) => {
    const startCoords =
      e?.nativeEvent?.pageX != null
        ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
        : undefined;

    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    buttonScale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    qtyScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 280 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );

    triggerFlyToCartAnimation(startCoords);

    setIsUpdatingCart(true);
    setCartQuantity(1);
    setTotalCartCount(prev => prev + 1);
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 2800);

    try {
      const saved = await addToCart({
        productId: product.id,
        name: product.name,
        subtitle: product.subtitle,
        price: product.price,
        unit: product.unit,
        image: product.image,
        quantity: 1,
      });
      setCartItem(saved);
    } catch (error) {
      Alert.alert('Cart', getErrorMessage(error, 'Could not add item to cart.'));
      loadCartState();
    } finally {
      setIsUpdatingCart(false);
    }
  };

  const handleIncrement = async (e?: any) => {
    if (cartQuantity === 0) {
      handleAddToCart(e);
      return;
    }

    const startCoords =
      e?.nativeEvent?.pageX != null
        ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
        : undefined;

    const nextQty = cartQuantity + 1;
    setCartQuantity(nextQty);
    setTotalCartCount(prev => prev + 1);

    qtyScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 280 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );

    triggerFlyToCartAnimation(startCoords);

    try {
      if (cartItem) {
        const updated = await updateCartItemQuantity(cartItem.id, nextQty);
        if (updated) setCartItem(updated);
      } else {
        const saved = await addToCart({
          productId: product.id,
          name: product.name,
          subtitle: product.subtitle,
          price: product.price,
          unit: product.unit,
          image: product.image,
          quantity: 1,
        });
        setCartItem(saved);
      }
    } catch (error) {
      Alert.alert('Cart', getErrorMessage(error, 'Could not update quantity.'));
      loadCartState();
    }
  };

  const handleDecrement = async () => {
    if (cartQuantity <= 0) return;

    const nextQty = cartQuantity - 1;
    setCartQuantity(nextQty);
    setTotalCartCount(prev => Math.max(0, prev - 1));

    qtyScale.value = withSequence(
      withSpring(0.75, { damping: 8, stiffness: 280 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );

    try {
      if (cartItem) {
        const updated = await updateCartItemQuantity(cartItem.id, nextQty);
        if (nextQty <= 0 || !updated) {
          setCartItem(null);
          setCartQuantity(0);
        } else {
          setCartItem(updated);
        }
      }
    } catch (error) {
      Alert.alert('Cart', getErrorMessage(error, 'Could not update quantity.'));
      loadCartState();
    }
  };

  const handleAddRelatedProduct = async (related: Product, e?: any) => {
    const startCoords =
      e?.nativeEvent?.pageX != null
        ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
        : undefined;

    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    triggerFlyToCartAnimation(startCoords);
    setTotalCartCount(prev => prev + 1);
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 2500);

    try {
      await addToCart({
        productId: related.id,
        name: related.name,
        subtitle: related.subtitle,
        price: related.price,
        unit: related.unit,
        image: related.image,
        quantity: 1,
      });
      if (related.id === product.id) {
        loadCartState();
      }
    } catch (error) {
      Alert.alert('Cart', getErrorMessage(error, 'Could not add item to cart.'));
      loadCartState();
    }
  };

  return (
    <View className="flex-1" style={styles.screen}>
      <ScrollView
        className="flex-1"
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        overScrollMode="never"
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View
            className="flex-row items-start justify-between"
            style={[{ paddingTop: insets.top + 12 }, shellStyle('page')]}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              style={styles.roundButton}
              onPress={() => navigation.goBack()}>
              <Icon color={colors.textPrimary} name="chevron-back" size={24} />
            </Pressable>

            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityLabel="Share product"
                accessibilityRole="button"
                style={styles.roundButton}>
                <Icon color={colors.textPrimary} name="share-social-outline" size={20} />
              </Pressable>
              <Pressable
                accessibilityLabel="Toggle favourite"
                accessibilityRole="button"
                style={[styles.roundButton, isFavourite && styles.favouriteButton]}
                onPress={handleFavouritePress}>
                <Animated.View style={heartAnimatedStyle}>
                  <Icon
                    color={isFavourite ? colors.danger : colors.textPrimary}
                    name={isFavourite ? 'heart' : 'heart-outline'}
                    size={20}
                  />
                </Animated.View>
              </Pressable>
              <Pressable
                accessibilityLabel="Go to Cart"
                accessibilityRole="button"
                style={styles.roundButton}
                onLayout={e => {
                  e.currentTarget.measureInWindow((x, y, width, height) => {
                    if (width > 0 && height > 0) {
                      setCartIconPosition({
                        x: x + width / 2 - 22,
                        y: y + height / 2 - 22,
                      });
                    }
                  });
                }}
                onPress={() => navigation.navigate('Cart')}>
                <Icon color={colors.textPrimary} name="cart-outline" size={21} />
                {totalCartCount > 0 ? (
                  <Animated.View style={[styles.headerCartBadge, cartBadgeAnimatedStyle]}>
                    <Text style={styles.headerCartBadgeText}>
                      {totalCartCount > 99 ? '99+' : totalCartCount}
                    </Text>
                  </Animated.View>
                ) : null}
              </Pressable>
            </View>
          </View>

          <View style={styles.imageStage}>
            {activeSource != null ? (
              <Image source={activeSource} style={styles.heroImage} resizeMode="contain" />
            ) : (
              <CategoryImage
                image={null}
                style={styles.heroImage}
                iconSize={56}
                iconName={productIconMeta.icon}
                iconColor={productIconMeta.color}
                iconBackgroundColor={productIconMeta.backgroundColor}
              />
            )}
            <View style={styles.freshBadge}>
              <Text className="text-sm font-bold text-primary-dark">100% Fresh</Text>
            </View>
          </View>

          <View style={styles.galleryRow}>
            {gallerySources.map((source, index) => {
              const selected = selectedImageIndex === index;
              return (
                <Pressable
                  key={`gallery-${index}`}
                  style={[styles.galleryCard, selected && styles.galleryCardSelected]}
                  onPress={() => setSelectedImageIndex(index)}>
                  {source != null ? (
                    <Image source={source} style={styles.galleryImage} resizeMode="contain" />
                  ) : (
                    <View
                      style={[
                        styles.galleryFallback,
                        { backgroundColor: productIconMeta.backgroundColor },
                      ]}>
                      <Icon
                        color={productIconMeta.color}
                        name={productIconMeta.icon}
                        size={18}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="pt-5" style={shellStyle('page')}>
          <View style={styles.priceCard}>
            <View className="flex-row items-center flex-wrap gap-2">
              <View style={styles.discountBadge}>
                <Text className="text-sm font-bold text-primary-dark">{discount}% OFF</Text>
              </View>
              <View style={styles.ratingPill}>
                <Icon color={colors.star} name="star" size={13} />
                <Text className="ml-1 text-sm font-bold text-slate-800">4.8</Text>
                <Text className="ml-1 text-sm text-slate-500">(128 reviews)</Text>
              </View>
            </View>

            <Text className="mt-3 text-xl font-bold leading-5 text-slate-900">{product.name}</Text>
            <Text className="mt-1 text-sm text-slate-500">{product.subtitle}</Text>

            <View className="mt-4 flex-row items-end">
              <Text className="text-xl font-bold text-primary">₹{product.price.toFixed(0)}</Text>
              <Text className="mb-0.5 ml-2 text-sm text-slate-400 line-through">₹{mrp}</Text>
              <Text className="mb-0.5 ml-2 text-sm text-slate-500">/{product.unit}</Text>
            </View>

            <Text className="mt-2 text-sm font-medium text-primary">Inclusive of all taxes</Text>
          </View>

          <ScrollView
            horizontal
            className="mt-4"
            contentContainerStyle={styles.chipRow}
            showsHorizontalScrollIndicator={false}>
            <InfoChip icon="leaf-outline" label="Farm Fresh" />
            <InfoChip icon="thermometer-outline" label="Cold Chain" />
            <InfoChip icon="checkmark-circle-outline" label="Quality Checked" />
            <InfoChip icon="repeat-outline" label="Easy Return" />
          </ScrollView>

          <SectionCard title="About this product">
            <Text className="text-sm leading-6 text-slate-600">
              {product.subtitle}. Sourced fresh for your daily needs and delivered with care from G-Fresh
              Mart. Perfect for everyday cooking, snacking, and family meals with consistent quality you
              can trust.
            </Text>
            <View className="mt-4 gap-2">
              {HIGHLIGHTS.map(item => (
                <View key={item} className="flex-row items-start">
                  <Icon color={colors.primary} name="checkmark-circle" size={18} />
                  <Text className="ml-2 flex-1 text-sm text-slate-700">{item}</Text>
                </View>
              ))}
            </View>
          </SectionCard>

          <SectionCard title="Delivery & service">
            <View className="gap-3">
              {DELIVERY_INFO.map(item => (
                <View key={item.title} className="flex-row items-center rounded-2xl bg-slate-50 px-3 py-3">
                  <View style={styles.deliveryIcon}>
                    <Icon color={colors.primary} name={item.icon} size={18} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-slate-900">{item.title}</Text>
                    <Text className="text-sm text-slate-500">{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>

          <SectionCard title="Product information">
            <View style={styles.detailTable}>
              {DETAIL_ROWS(product).map((row, index) => (
                <View
                  key={row.label}
                  className="flex-row items-center justify-between py-3"
                  style={index > 0 ? styles.detailDivider : undefined}>
                  <Text className="text-sm text-slate-500">{row.label}</Text>
                  <Text
                    className={`text-sm font-semibold ${row.highlight ? 'text-primary' : 'text-slate-900'}`}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>

          <SectionCard title="Customer reviews">
            <View className="mb-4 flex-row items-center">
              <Text className="text-sm font-bold text-slate-900">4.8</Text>
              <View className="ml-4">
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Icon key={star} color={colors.star} name="star" size={14} />
                  ))}
                </View>
                <Text className="mt-1 text-sm text-slate-500">Based on 128 verified orders</Text>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {REVIEW_TAGS.map(tag => (
                <View key={tag} style={styles.reviewTag}>
                  <Text className="text-sm font-semibold text-slate-700">{tag}</Text>
                </View>
              ))}
            </View>
            <View className="mt-4 rounded-2xl bg-slate-50 p-4">
              <Text className="text-sm font-bold text-slate-900">Rahul K.</Text>
              <Text className="mt-1 text-sm text-slate-500">Verified buyer · 2 days ago</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-600">
                Very fresh and neatly packed. Delivery was quick and the quality matched the photos.
              </Text>
            </View>
          </SectionCard>

          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>You may also like</Text>
            <Text style={styles.relatedSubtitle}>Similar items from G-Fresh Mart</Text>

            {relatedItems.length === 0 ? (
              <View style={styles.relatedEmpty}>
                <Text style={styles.relatedEmptyText}>Finding similar items…</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={156}
                contentContainerStyle={styles.relatedRail}>
                {relatedItems.map(item => (
                  <RelatedProductCard
                    key={item.id}
                    product={item}
                    onAdd={handleAddRelatedProduct}
                    onPress={() => navigation.push('ProductDetail', { product: item })}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Dynamic Slide-Up Added to Cart Toast */}
      {showAddedToast && (
        <View style={[styles.floatingToast, { bottom: insets.bottom + 84 }]}>
          <View style={styles.toastInner}>
            <View style={styles.toastIconWrap}>
              <Icon color="#10B981" name="checkmark-circle" size={18} />
            </View>
            <View className="flex-1 ml-2 mr-3">
              <Text numberOfLines={1} style={styles.toastTitle}>
                {product.name} ({cartQuantity} {product.unit})
              </Text>
              <Text style={styles.toastSub}>Added to your basket</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              style={styles.toastBtn}
              onPress={() => navigation.navigate('Cart')}>
              <Text style={styles.toastBtnText}>View Cart →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Floating Animated Flying Item during Add */}
      <Animated.View style={flyingAnimatedStyle} pointerEvents="none">
        <View style={styles.flyingBubble}>
          {activeSource != null ? (
            <Image source={activeSource} style={styles.flyingImage} resizeMode="contain" />
          ) : (
            <Icon color={colors.white} name="cart" size={18} />
          )}
        </View>
      </Animated.View>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        <View className="flex-1">
          <Text className="text-xs font-medium text-slate-500">
            {cartQuantity > 0 ? `Total (${cartQuantity} ${product.unit})` : 'Unit Price'}
          </Text>
          <View className="flex-row items-baseline gap-1.5 mt-0.5">
            <Text className="text-2xl font-black text-slate-900">
              ₹{cartQuantity > 0 ? (product.price * cartQuantity).toFixed(0) : product.price.toFixed(0)}
            </Text>
            {cartQuantity > 0 ? (
              <Text className="text-xs text-slate-400 font-medium">
                (₹{product.price.toFixed(0)}/{product.unit})
              </Text>
            ) : null}
          </View>
        </View>

        {cartQuantity === 0 ? (
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              accessibilityLabel="Add to Cart"
              accessibilityRole="button"
              style={[styles.cartButton, isUpdatingCart && styles.cartButtonDisabled]}
              disabled={isUpdatingCart}
              onPress={e => handleAddToCart(e)}>
              {isUpdatingCart ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Icon color={colors.white} name="cart" size={19} />
                  <Text className="ml-2 text-[15px] font-bold text-white">Add to Cart</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.stepperContainer}>
            <Pressable
              accessibilityLabel="Decrease quantity"
              accessibilityRole="button"
              hitSlop={8}
              style={[
                styles.stepperButton,
                cartQuantity === 1 ? styles.stepperButtonTrash : styles.stepperButtonMinus,
              ]}
              disabled={isUpdatingCart}
              onPress={handleDecrement}>
              <Icon
                color={cartQuantity === 1 ? '#EF4444' : colors.primary}
                name={cartQuantity === 1 ? 'trash-outline' : 'remove'}
                size={18}
              />
            </Pressable>

            <View style={styles.stepperCountWrap}>
              <Animated.Text style={[styles.stepperCountText, qtyAnimatedStyle]}>
                {cartQuantity}
              </Animated.Text>
              <Text style={styles.stepperUnitLabel}>in cart</Text>
            </View>

            <Pressable
              accessibilityLabel="Increase quantity"
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.stepperButton, styles.stepperButtonPlus]}
              disabled={isUpdatingCart}
              onPress={e => handleIncrement(e)}>
              <Icon color={colors.white} name="add" size={19} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  hero: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    paddingBottom: 18,
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    elevation: 3,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    width: 44,
  },
  headerCartBadge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -3,
    top: -3,
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  favouriteButton: {
    backgroundColor: '#FEE2E2',
  },
  imageStage: {
    alignItems: 'center',
    backgroundColor: colors.white,
    height: 220,
    justifyContent: 'center',
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  heroImage: {
    height: 148,
    width: 148,
  },
  freshBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    left: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    top: 12,
  },
  galleryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
  galleryCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    elevation: 1,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    width: 64,
  },
  galleryCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  galleryImage: {
    height: 44,
    width: 44,
  },
  galleryFallback: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  priceCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  discountBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingPill: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipRow: {
    gap: 8,
    paddingRight: 20,
  },
  infoChip: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  deliveryIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  detailTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  detailDivider: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
  },
  reviewTag: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  relatedSection: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 16,
    paddingTop: 18,
  },
  relatedTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  relatedSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 14,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  relatedRail: {
    gap: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  relatedCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    paddingBottom: 12,
    width: 144,
  },
  relatedImageWrap: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: 118,
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  relatedImage: {
    height: 72,
    width: 72,
  },
  relatedOffer: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: 'absolute',
    top: 8,
  },
  relatedOfferText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },
  relatedName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  relatedUnit: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
    paddingHorizontal: 12,
    textTransform: 'uppercase',
  },
  relatedFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  relatedPrice: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  relatedMrp: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
    textDecorationLine: 'line-through',
  },
  relatedAdd: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  relatedEmpty: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
  },
  relatedEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 10,
    flexDirection: 'row',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    position: 'absolute',
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cartButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    elevation: 4,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  cartButtonDisabled: {
    opacity: 0.8,
  },
  stepperContainer: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
  },
  stepperButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stepperButtonMinus: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  stepperButtonTrash: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  stepperButtonPlus: {
    backgroundColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  stepperCountWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    paddingHorizontal: 4,
  },
  stepperCountText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  stepperUnitLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
    marginTop: -1,
    textTransform: 'uppercase',
  },
  floatingToast: {
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 999,
  },
  toastInner: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  toastIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  toastSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  toastBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toastBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  flyingBubble: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    elevation: 12,
    height: 44,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    width: 44,
  },
  flyingImage: {
    height: 28,
    width: 28,
  },
});
