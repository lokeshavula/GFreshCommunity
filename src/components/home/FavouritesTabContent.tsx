import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  favouriteToProduct,
  fetchFavourites,
  removeFavourite,
} from '../../services/favouriteService';
import { getCurrentUser } from '../../services/userService';
import { FavouriteItem } from '../../types/favourite';
import { Product } from '../../types/product';
import { colors } from '../../theme/colors';
import { getErrorMessage } from '../../utils/errorMessage';
import { getImageSource } from '../../utils/imageSource';
import { getProductIconMeta } from '../../utils/itemIcons';
import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  bottomPadding?: number;
  onShopNow: () => void;
  onOpenProduct: (product: Product) => void;
  onSignIn: () => void;
  onBack?: () => void;
};

export function FavouritesTabContent({
  bottomPadding = 120,
  onShopNow,
  onOpenProduct,
  onSignIn,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();
  const [items, setItems] = useState<FavouriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setIsSignedIn(Boolean(user));
      if (!user) {
        setItems([]);
        return;
      }
      setItems(await fetchFavourites());
    } catch (error) {
      Alert.alert('Favourites', getErrorMessage(error, 'Could not load favourites.'));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemove = async (item: FavouriteItem) => {
    try {
      await removeFavourite(item.productId);
      setItems(current => current.filter(row => row.productId !== item.productId));
    } catch (error) {
      Alert.alert('Favourites', getErrorMessage(error, 'Could not remove favourite.'));
    }
  };

  const topPad = insets.top + 16;

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: topPad, paddingBottom: bottomPadding }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topPad }, shellStyle('wide')]}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable hitSlop={8} style={styles.backBtn} onPress={onBack}>
              <Icon color={colors.textPrimary} name="arrow-back" size={22} />
            </Pressable>
          ) : (
            <View style={styles.headerIcon}>
              <Icon color={colors.danger} name="heart" size={18} />
            </View>
          )}
          <View style={styles.headerText}>
            <View className="flex-row items-center">
              <Text style={styles.headerTitle}>Favourites</Text>
              {onBack ? (
                <View style={styles.headerIconSmall}>
                  <Icon color={colors.danger} name="heart" size={12} />
                </View>
              ) : null}
            </View>
            <Text style={styles.headerSub}>
              {!isSignedIn
                ? 'Sign in to save items'
                : items.length === 0
                  ? 'No saved items yet'
                  : `${items.length} saved item${items.length === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>
      </View>

      {!isSignedIn ? (
        <View style={[styles.centered, { paddingBottom: bottomPadding }, shellStyle('wide')]}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon color={colors.danger} name="heart-outline" size={32} />
            </View>
            <Text style={styles.emptyTitle}>Save what you love</Text>
            <Text style={styles.emptySub}>
              Sign in to keep favourites across devices and find them here anytime.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={onSignIn}>
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.centered, { paddingBottom: bottomPadding }, shellStyle('wide')]}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon color={colors.danger} name="heart-outline" size={32} />
            </View>
            <Text style={styles.emptyTitle}>No favourites yet</Text>
            <Text style={styles.emptySub}>
              Tap the heart on any product page to save it here for quick reordering.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={onShopNow}>
              <Text style={styles.primaryBtnText}>Browse products</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}>
          <View style={[{ gap: 10 }, shellStyle('wide')]}>
            {items.map(item => {
              const product = favouriteToProduct(item);
              const iconMeta = getProductIconMeta(product);
              return (
                <Pressable
                  key={item.id}
                  style={styles.rowCard}
                  onPress={() => onOpenProduct(product)}>
                  <View style={styles.thumb}>
                    {item.image != null ? (
                      <Image
                        fadeDuration={0}
                        resizeMode="contain"
                        source={getImageSource(item.image)}
                        style={styles.thumbImage}
                      />
                    ) : (
                      <Icon color={iconMeta.color} name={iconMeta.icon} size={28} />
                    )}
                  </View>

                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.subtitle || `Per ${item.unit}`}
                    </Text>
                    <Text style={styles.rowPrice}>
                      ₹{item.price.toFixed(0)}
                      <Text style={styles.rowUnit}>/{item.unit}</Text>
                    </Text>
                  </View>

                  <View style={styles.rowActions}>
                    <Pressable
                      hitSlop={8}
                      style={styles.heartBtn}
                      onPress={event => {
                        event.stopPropagation();
                        handleRemove(item);
                      }}>
                      <Icon color={colors.danger} name="heart" size={18} />
                    </Pressable>
                    <Icon color="#CBD5E1" name="chevron-forward" size={18} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerIconSmall: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    marginLeft: 8,
    width: 22,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    marginBottom: 16,
    width: 72,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  rowCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E8F5EC',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  thumbImage: {
    height: 52,
    width: 52,
  },
  rowBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  rowName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  rowPrice: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  rowUnit: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  rowActions: {
    alignItems: 'center',
    gap: 10,
  },
  heartBtn: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
