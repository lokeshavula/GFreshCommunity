import { useState, useEffect, useCallback, useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { RootStackParamList } from '../navigation/AppNavigator';
import { HOME_CAROUSEL_CATEGORIES } from '../data/homeCategories';
import { FALLBACK_POPULAR_PRODUCTS } from '../data/fallbackProducts';
import { AccountTabContent } from '../components/home/AccountTabContent';
import { AppStatusBar } from '../components/AppStatusBar';
import { ChatTabContent } from '../components/home/ChatTabContent';
import { FavouritesTabContent } from '../components/home/FavouritesTabContent';
import { HomeCategoryRow } from '../components/home/HomeCategoryRow';
import { HomeHeader } from '../components/home/HomeHeader';
import { HomePromoCarousel } from '../components/home/HomePromoCarousel';
import { HomeTodayPricesBanner } from '../components/home/HomeTodayPricesBanner';
import { HomeShopByLifestyle } from '../components/home/HomeShopByLifestyle';
import { HomeServiceStrip } from '../components/home/HomeServiceStrip';
import { OrdersTabContent } from '../components/home/OrdersTabContent';
import { PopularProductCard } from '../components/home/PopularProductCard';
import { FreshArrivalsStoryBar } from '../components/home/FreshArrivalsStoryBar';
import { FreshArrivalsStoryModal } from '../components/home/FreshArrivalsStoryModal';
import { HomeCommunityActionStrip } from '../components/home/HomeCommunityActionStrip';
import { GroupBuyingModal } from '../components/home/GroupBuyingModal';
import { TodayDealModal } from '../components/home/TodayDealModal';
import { TomorrowDemandPollModal } from '../components/home/TomorrowDemandPollModal';
import { fetchActiveFreshArrivals } from '../services/freshArrivalsService';
import { FreshArrivalItem } from '../types/freshArrival';
import {
  addToCart,
  fetchCartCount,
  fetchCartItems,
  removeCartItem,
  updateCartItemQuantity,
} from '../services/cartService';
import { fetchUnreadChatCount } from '../services/neighbourChatService';
import { formatHouseholdLabelFromUser } from '../services/householdService';
import { fetchPopularProducts } from '../services/productService';
import { getCurrentUser, refreshUserFromServer } from '../services/userService';
import { supabase } from '../lib/supabase';
import { Product } from '../types/product';
import { colors } from '../theme/colors';
import { getRouteForUser } from '../utils/authGuard';
import { getErrorMessage } from '../utils/errorMessage';
import { openAccountPage } from '../utils/openAccountPage';
import { CONTENT_MAX, useBottomChromeInset, useGridColumns, useResponsiveLayout } from '../utils/layout';

const POPULAR_FILTERS = [
  { id: 'all', label: 'All', icon: 'sparkles' },
  { id: 'veg', label: 'Veggies', icon: 'leaf' },
  { id: 'fruit', label: 'Fruits', icon: 'nutrition' },
  { id: 'dairy', label: 'Dairy', icon: 'water' },
] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { deviceSize, shellStyle } = useResponsiveLayout();
  const chromeInset = useBottomChromeInset(
    deviceSize === 'largeTablet' ? CONTENT_MAX.full : CONTENT_MAX.wide,
  );
  const { itemWidth, gap } = useGridColumns({
    minItemWidth: 150,
    phoneColumns: 2,
    maxColumns: 6,
    gap: 12,
  });
  const fromAdmin = Boolean(route.params?.fromAdmin);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(route.params?.activeTab ?? 'home');
  const [popularFilter, setPopularFilter] = useState<'all' | 'veg' | 'fruit' | 'dairy'>('all');
  const [popularItems, setPopularItems] = useState<Product[]>(FALLBACK_POPULAR_PRODUCTS);
  const [arrivals, setArrivals] = useState<FreshArrivalItem[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [demandModalVisible, setDemandModalVisible] = useState(false);
  const [groupBuyingModalVisible, setGroupBuyingModalVisible] = useState(false);
  const [todayDealModalVisible, setTodayDealModalVisible] = useState(false);
  const [_demandRefreshTrigger, setDemandRefreshTrigger] = useState(0);
  const [userName, setUserName] = useState('Guest');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [householdLabel, setHouseholdLabel] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartItemsMap, setCartItemsMap] = useState<Record<string, { id: string; quantity: number }>>({});
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [animatingItem, setAnimatingItem] = useState<Product | null>(null);

  const animX = useSharedValue(0);
  const animY = useSharedValue(0);
  const animScale = useSharedValue(1);
  const animOpacity = useSharedValue(0);

  useEffect(() => {
    getCurrentUser().then(user => {
      setUserName(user?.fullName ?? 'Guest');
      setAvatarUrl(user?.avatarUrl ?? null);
      setHouseholdLabel(formatHouseholdLabelFromUser(user));
    });
  }, [activeTab]);

  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab === 'cart' ? 'home' : route.params.activeTab);
    }
  }, [route.params?.activeTab]);

  const refreshCartCount = useCallback(async () => {
    try {
      const items = await fetchCartItems();
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
      const map: Record<string, { id: string; quantity: number }> = {};
      items.forEach(i => {
        map[i.productId] = { id: i.id, quantity: i.quantity };
      });
      setCartItemsMap(map);
    } catch {
      setCartCount(0);
      setCartItemsMap({});
    }
  }, []);

  const refreshChatUnreadCount = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user?.id) {
        setChatUnreadCount(0);
        return;
      }
      const count = await fetchUnreadChatCount(user.id);
      setChatUnreadCount(count);
    } catch {
      setChatUnreadCount(0);
    }
  }, []);

  // Realtime subscription for incoming chat messages across the whole app
  useEffect(() => {
    let channel: any = null;
    (async () => {
      const user = await getCurrentUser();
      if (!user?.id || !supabase) return;

      channel = supabase
        .channel(`home_chat_badge_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'gfm_neighbour_messages' },
          () => {
            refreshChatUnreadCount();
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'gfm_neighbour_connections' },
          () => {
            refreshChatUnreadCount();
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshChatUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const current = await getCurrentUser();
          if (!current || route.params?.fromAdmin || !active) return;

          const fresh = await refreshUserFromServer(current.id);
          if (!active || !fresh) return;

          setUserName(fresh.fullName ?? 'Guest');
          setAvatarUrl(fresh.avatarUrl ?? null);
          setHouseholdLabel(formatHouseholdLabelFromUser(fresh));

          const nextRoute = getRouteForUser(fresh);
          if (nextRoute !== 'Home') {
            (navigation.replace as (screen: keyof RootStackParamList) => void)(nextRoute);
          }
        } catch {
          // Keep Home usable even if profile refresh fails
        }
      })();
      return () => {
        active = false;
      };
    }, [navigation, route.params?.fromAdmin]),
  );

  useFocusEffect(
    useCallback(() => {
      refreshCartCount();
      refreshChatUnreadCount();
      fetchPopularProducts()
        .then(setPopularItems)
        .catch(() => setPopularItems(FALLBACK_POPULAR_PRODUCTS));
      fetchActiveFreshArrivals()
        .then(setArrivals)
        .catch(() => { });
      // Cart is a stack screen — never leave Home stuck on empty "cart" tab
      setActiveTab(current => (current === 'cart' ? 'home' : current));
    }, [refreshCartCount, refreshChatUnreadCount]),
  );

  const handleOpenStory = (index: number) => {
    setSelectedStoryIndex(index);
    setStoryModalVisible(true);
  };

  const handleWatchAllStories = () => {
    setSelectedStoryIndex(0);
    setStoryModalVisible(true);
  };

  const finishAnimation = () => {
    setAnimatingItem(null);
    animOpacity.value = 0;
    refreshCartCount();
  };

  const handleAddToCart = (item: Product, event: any) => {
    event.stopPropagation();

    const runAdd = async () => {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to add items to your cart.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      try {
        await addToCart({
          productId: item.id,
          name: item.name,
          subtitle: item.subtitle,
          price: item.price,
          unit: item.unit,
          image: item.image,
          quantity: 1,
        });
        setCartItemsMap(prev => ({
          ...prev,
          [item.id]: { id: prev[item.id]?.id || '', quantity: (prev[item.id]?.quantity || 0) + 1 },
        }));
      } catch (error) {
        Alert.alert('Cart', getErrorMessage(error, 'Could not add item to cart.'));
        return;
      }

      if (!event?.target?.measure) {
        refreshCartCount();
        return;
      }

      event.target.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        const startX = pageX + w / 2 - 20;
        const startY = pageY + h / 2 - 20;

        animX.value = startX;
        animY.value = startY;
        animScale.value = 0.5;
        animOpacity.value = 1;
        setAnimatingItem(item);
        animScale.value = withSpring(1.5, { damping: 10, stiffness: 100 });

        const cartX = width / 2 - 24;
        const cartY = height - insets.bottom - 70;

        setTimeout(() => {
          animX.value = withTiming(cartX, {
            duration: 700,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
          animY.value = withTiming(cartY, {
            duration: 700,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });
          animScale.value = withTiming(0.3, { duration: 700 });
          animOpacity.value = withTiming(0, { duration: 700 }, () => {
            runOnJS(finishAnimation)();
          });
        }, 200);
      });
    };

    runAdd();
  };

  const handleIncrement = async (item: Product) => {
    setCartItemsMap(prev => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: { id: existing?.id || '', quantity: (existing?.quantity || 0) + 1 },
      };
    });
    setCartCount(c => c + 1);

    try {
      await addToCart({
        productId: item.id,
        name: item.name,
        subtitle: item.subtitle,
        price: item.price,
        unit: item.unit,
        image: item.image,
        quantity: 1,
      });
      refreshCartCount();
    } catch {
      refreshCartCount();
    }
  };

  const handleDecrement = async (item: Product) => {
    const current = cartItemsMap[item.id];
    if (!current) return;

    setCartItemsMap(prev => {
      const copy = { ...prev };
      if (current.quantity <= 1) {
        delete copy[item.id];
      } else {
        copy[item.id] = { ...current, quantity: current.quantity - 1 };
      }
      return copy;
    });
    setCartCount(c => Math.max(0, c - 1));

    try {
      if (current.quantity <= 1) {
        if (current.id) {
          await removeCartItem(current.id);
        }
      } else {
        if (current.id) {
          await updateCartItemQuantity(current.id, current.quantity - 1);
        }
      }
      refreshCartCount();
    } catch {
      refreshCartCount();
    }
  };

  const filteredPopularItems = useMemo(() => {
    if (popularFilter === 'veg') {
      return popularItems.filter(
        item => item.id.startsWith('veg') || item.id.includes('carrot') || item.id.includes('tomato') || item.id.includes('broccoli')
      );
    }
    if (popularFilter === 'fruit') {
      return popularItems.filter(
        item => item.id.startsWith('fruit') || item.id.includes('watermelon') || item.id.includes('grapes') || item.id.includes('apple')
      );
    }
    if (popularFilter === 'dairy') {
      return popularItems.filter(
        item => item.id.startsWith('dairy') || item.id.includes('milk') || item.id.includes('paneer') || item.id.includes('curd')
      );
    }
    return popularItems;
  }, [popularFilter, popularItems]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: animX.value,
    top: animY.value,
    transform: [{ scale: animScale.value }],
    opacity: animOpacity.value,
    zIndex: 1000,
  }));

  return (
    <View className="flex-1" style={styles.screen}>
      <AppStatusBar lightContent={activeTab === 'home'} />
      {activeTab === 'home' ? (
        <View pointerEvents="none" style={[styles.statusBleed, { height: Math.max(insets.top, 0) }]} />
      ) : null}
      {animatingItem ? (
        <Animated.View style={animatedStyle} pointerEvents="none">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Icon color={colors.white} name="cart" size={24} />
          </View>
        </Animated.View>
      ) : null}

      {activeTab === 'home' ? (
        <ScrollView
          className="flex-1"
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="never"
          overScrollMode="never"
          showsVerticalScrollIndicator={false}>
          <HomeHeader
            avatarUrl={avatarUrl}
            householdLabel={householdLabel}
            searchQuery={searchQuery}
            topInset={insets.top}
            userName={userName}
            onOpenFavourites={() => setActiveTab('favourite')}
            onOpenNotifications={() => navigation.navigate('Notifications')}
            onSearchChange={setSearchQuery}
          />

          <FreshArrivalsStoryBar
            arrivals={arrivals}
            onSelectStory={handleOpenStory}
            onWatchAll={handleWatchAllStories}
          />

          <HomeCategoryRow
            categories={HOME_CAROUSEL_CATEGORIES}
            onAllPress={() => navigation.navigate('Categories')}
            onCategoryPress={category =>
              navigation.navigate('CategoryItems', {
                sectionId: category.id,
                sectionName: category.name,
              })
            }
          />

          <HomePromoCarousel
            onPressSlide={slide => {
              if (slide.id === '1') {
                navigation.navigate('TodayPrices');
              } else {
                navigation.navigate('Categories');
              }
            }}
          />
          <HomeTodayPricesBanner onPress={() => navigation.navigate('TodayPrices')} />
          <HomeShopByLifestyle
            onSelectCategory={card =>
              navigation.navigate('CategoryItems', {
                sectionId: card.id,
                sectionName: card.sectionName,
              })
            }
          />
          <HomeCommunityActionStrip
            onOpenCommunityPoll={() => setDemandModalVisible(true)}
            onOpenGroupBuying={() => setGroupBuyingModalVisible(true)}
            onOpenTodayDeal={() => setTodayDealModalVisible(true)}
          />
          <HomeServiceStrip />

          <View style={[styles.popularSectionWrap, shellStyle('wide')]}>
            <View className="mb-4 flex-row items-end justify-between">
              <View className="flex-1 pr-3">
                <View className="mb-1.5 flex-row items-center">
                  <View style={styles.sectionAccent} />
                  <Text className="ml-2 text-[11px] font-bold uppercase tracking-wide text-primary">
                    Community picks
                  </Text>
                </View>
                <Text className="text-lg font-bold text-slate-900">Popular Items</Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  Fresh favourites loved by your neighbours
                </Text>
              </View>
              <Pressable style={styles.viewAllChip} onPress={() => navigation.navigate('Categories')}>
                <Text className="text-xs font-bold text-primary">View all</Text>
                <Icon color={colors.primary} name="arrow-forward" size={12} />
              </Pressable>
            </View>

            {/* Quick Filter Horizontal Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={styles.filterScrollWrapper}>
              {POPULAR_FILTERS.map(filter => {
                const isActive = popularFilter === filter.id;
                return (
                  <Pressable
                    key={filter.id}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setPopularFilter(filter.id)}>
                    <Icon
                      name={filter.icon}
                      size={13}
                      color={isActive ? '#FFFFFF' : '#475569'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="flex-row flex-wrap" style={{ gap }}>
              {filteredPopularItems.map(item => (
                <PopularProductCard
                  key={item.id}
                  product={item}
                  quantity={cartItemsMap[item.id]?.quantity || 0}
                  width={itemWidth}
                  onAddToCart={event => handleAddToCart(item, event)}
                  onDecrement={() => handleDecrement(item)}
                  onIncrement={() => handleIncrement(item)}
                  onPress={() => navigation.navigate('ProductDetail', { product: item })}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : null}

      {activeTab === 'chat' ? (
        <ChatTabContent
          bottomPadding={120}
          householdLabel={householdLabel}
          userName={userName}
          onOpenCategories={() => navigation.navigate('Categories')}
          onOpenOrders={() => setActiveTab('order')}
          onOpenPrices={() => navigation.navigate('TodayPrices')}
          onOpenRfid={() => navigation.navigate('RfIdCard')}
          onOpenCart={() => navigation.navigate('Cart')}
          onUnreadCountChange={setChatUnreadCount}
        />
      ) : null}

      {activeTab === 'account' ? (
        <AccountTabContent
          bottomPadding={120}
          onOpenPage={destination => openAccountPage(navigation, destination)}
          onSignIn={() => navigation.navigate('Login')}
          onLogout={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          }
        />
      ) : null}

      {activeTab === 'favourite' ? (
        <FavouritesTabContent
          bottomPadding={120}
          onBack={() => setActiveTab('home')}
          onOpenProduct={product => navigation.navigate('ProductDetail', { product })}
          onShopNow={() => setActiveTab('home')}
          onSignIn={() => navigation.navigate('Login')}
        />
      ) : null}

      {activeTab === 'order' ? (
        <OrdersTabContent
          bottomPadding={120}
          onOpenCart={() => navigation.navigate('Cart')}
          onShopNow={() => setActiveTab('home')}
          onTrackOrder={order =>
            navigation.navigate('TrackOrder', {
              orderId: order.orderId,
              deliverySlot: order.deliverySlot,
              deliveryTime: order.deliveryTime,
              blockNumber: order.blockNumber,
              flatNo: order.flatNo,
              orderedAt: order.orderedAt,
              status: order.status,
              initialOrder: order,
            })
          }
        />
      ) : null}

      {fromAdmin ? (
        <Pressable
          style={[styles.adminReturnBar, { bottom: insets.bottom + 88 }]}
          onPress={() => navigation.navigate('AdminDashboard')}>
          <View style={styles.adminReturnIcon}>
            <Icon color={colors.primaryDark} name="shield-checkmark" size={16} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-white">Back to Admin</Text>
            <Text className="text-[11px] text-white/70">Return to admin dashboard</Text>
          </View>
          <Icon color={colors.accent} name="arrow-forward" size={18} />
        </Pressable>
      ) : null}

      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: insets.bottom + 10,
            left: chromeInset.left,
            right: chromeInset.right,
          },
        ]}>
        <Pressable className="items-center justify-center" onPress={() => setActiveTab('home')}>
          <Icon
            color={activeTab === 'home' ? colors.primary : colors.textMuted}
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={24}
          />
          <Text
            className={`mt-1 text-xs ${activeTab === 'home' ? 'font-semibold text-primary' : 'text-slate-400'}`}>
            Home
          </Text>
        </Pressable>

        <Pressable className="items-center justify-center" onPress={() => setActiveTab('chat')}>
          <View style={styles.tabIconWrap}>
            <Icon
              color={activeTab === 'chat' ? colors.primary : colors.textMuted}
              name={activeTab === 'chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={24}
            />
            {chatUnreadCount > 0 ? (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className={`mt-1 text-xs ${activeTab === 'chat' ? 'font-semibold text-primary' : 'text-slate-400'}`}>
            Chat
          </Text>
        </Pressable>

        <Pressable
          className="-mt-6 items-center justify-center"
          onPress={() => navigation.navigate('Cart')}>
          <View style={styles.cartButton}>
            <Icon color={colors.white} name="cart" size={28} />
            {cartCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text className="text-[10px] font-bold text-white">{cartCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <Pressable className="items-center justify-center" onPress={() => setActiveTab('order')}>
          <Icon
            color={activeTab === 'order' ? colors.primary : colors.textMuted}
            name={activeTab === 'order' ? 'receipt' : 'receipt-outline'}
            size={24}
          />
          <Text
            className={`mt-1 text-xs ${activeTab === 'order' ? 'font-semibold text-primary' : 'text-slate-400'}`}>
            Order
          </Text>
        </Pressable>

        <Pressable className="items-center justify-center" onPress={() => setActiveTab('account')}>
          <Icon
            color={activeTab === 'account' ? colors.primary : colors.textMuted}
            name={activeTab === 'account' ? 'person' : 'person-outline'}
            size={24}
          />
          <Text
            className={`mt-1 text-xs ${activeTab === 'account' ? 'font-semibold text-primary' : 'text-slate-400'}`}>
            Account
          </Text>
        </Pressable>
      </View>

      <FreshArrivalsStoryModal
        arrivals={arrivals}
        initialIndex={selectedStoryIndex}
        visible={storyModalVisible}
        onClose={() => setStoryModalVisible(false)}
        onGoToCart={() => navigation.navigate('Cart')}
        onRequireLogin={() => navigation.navigate('Login')}
      />

      <TomorrowDemandPollModal
        visible={demandModalVisible}
        onClose={() => setDemandModalVisible(false)}
        onVoteUpdated={() => setDemandRefreshTrigger(prev => prev + 1)}
      />

      <GroupBuyingModal
        visible={groupBuyingModalVisible}
        onClose={() => setGroupBuyingModalVisible(false)}
      />

      <TodayDealModal
        visible={todayDealModalVisible}
        onClose={() => setTodayDealModalVisible(false)}
        onViewAllRates={() => navigation.navigate('TodayPrices')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  popularSectionWrap: {
    marginTop: 24,
  },
  statusBleed: {
    backgroundColor: colors.primaryDark,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  sectionAccent: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  viewAllChip: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterScrollWrapper: {
    marginBottom: 14,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: '#0F4A2C',
    borderColor: '#0F4A2C',
    elevation: 2,
    shadowColor: '#0F4A2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  filterChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    elevation: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 100,
  },
  adminReturnBar: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 18,
    elevation: 12,
    flexDirection: 'row',
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    zIndex: 110,
  },
  adminReturnIcon: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cartButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    elevation: 8,
    height: 64,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 64,
  },
  cartBadge: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 2,
    top: 2,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chatBadge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 1.5,
    elevation: 4,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    top: -4,
    zIndex: 10,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 11,
    textAlign: 'center',
  },
});
