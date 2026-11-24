import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
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
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/AppNavigator';
import { AppStatusBar } from '../components/AppStatusBar';
import {
  fetchCartItems,
  refreshCartPricesFromCatalog,
  removeCartItem,
  updateCartItemQuantity,
} from '../services/cartService';
import { calculateOrderTotal } from '../services/orderService';
import { getCurrentUser } from '../services/userService';
import { CartItem } from '../types/cart';
import { GfmOrderItem } from '../types/gfm';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useResponsiveLayout } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

const toOrderItem = (item: CartItem): GfmOrderItem => ({
  id: item.productId,
  name: item.name,
  subtitle: item.subtitle,
  price: item.price,
  unit: item.unit,
  quantity: item.quantity,
  image: typeof item.image === 'string' ? item.image : undefined,
});

const DELIVERY_SLOTS = [
  { id: 'Today', label: 'Today', sublabel: 'Standard', icon: 'flash' },
  { id: 'Tomorrow', label: 'Tomorrow', sublabel: 'Scheduled', icon: 'calendar' },
];

const DELIVERY_TIMES = [
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '4:00 PM - 6:00 PM',
  '7:00 PM - 9:00 PM',
];

const QUICK_INSTRUCTIONS = [
  { id: 'door', label: 'Leave at door', icon: 'home-outline' },
  { id: 'nobell', label: "Don't ring bell", icon: 'notifications-off-outline' },
  { id: 'call', label: 'Avoid calling', icon: 'call-outline' },
];

export function CartScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isTablet, pageMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[0].id);
  const [deliveryTime, setDeliveryTime] = useState(DELIVERY_TIMES[0]);
  const [instructions, setInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const user = await getCurrentUser();
      if (!user) {
        setCartItems([]);
        return;
      }
      const items = await refreshCartPricesFromCatalog().catch(() => fetchCartItems());
      setCartItems(items);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to load cart.'));
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [loadCart]),
  );

  const getImageSource = (image: string | number): ImageSourcePropType =>
    typeof image === 'string' ? { uri: image } : image;

  const handleIncrease = async (item: CartItem) => {
    setUpdatingId(item.id);
    try {
      const updated = await updateCartItemQuantity(item.id, item.quantity + 1);
      if (updated) {
        setCartItems(current => current.map(row => (row.id === item.id ? updated : row)));
      }
    } catch (error) {
      Alert.alert('Cart', getErrorMessage(error, 'Could not update quantity.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDecrease = async (item: CartItem) => {
    setUpdatingId(item.id);
    try {
      const nextQty = item.quantity - 1;
      const updated = await updateCartItemQuantity(item.id, nextQty);
      if (updated == null) {
        setCartItems(current => current.filter(row => row.id !== item.id));
      } else {
        setCartItems(current => current.map(row => (row.id === item.id ? updated : row)));
      }
    } catch (error) {
      Alert.alert('Cart', getErrorMessage(error, 'Could not update quantity.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (item: CartItem) => {
    setUpdatingId(item.id);
    try {
      await removeCartItem(item.id);
      setCartItems(current => current.filter(row => row.id !== item.id));
    } catch (error) {
      Alert.alert('Cart', getErrorMessage(error, 'Could not remove item.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleQuickInstruction = (label: string) => {
    if (instructions.includes(label)) {
      setInstructions(prev =>
        prev
          .replace(label, '')
          .replace(/^,\s*/, '')
          .replace(/,\s*,/g, ',')
          .trim(),
      );
    } else {
      setInstructions(prev => (prev.trim() ? `${prev.trim()}, ${label}` : label));
    }
  };

  const orderTotal = useMemo(() => calculateOrderTotal(cartItems.map(toOrderItem)), [cartItems]);
  const totalItemCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems],
  );
  const totalMrp = useMemo(
    () =>
      cartItems.reduce(
        (acc, item) => acc + Math.round(item.price * 1.25) * item.quantity,
        0,
      ),
    [cartItems],
  );
  const totalSavings = useMemo(() => Math.max(0, totalMrp - orderTotal), [totalMrp, orderTotal]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to place an order.');
      navigation.navigate('Login');
      return;
    }

    setIsPlacingOrder(true);
    try {
      navigation.navigate('Payment', {
        checkout: {
          items: cartItems.map(toOrderItem),
          deliverySlot,
          deliveryTime,
          instructions,
          total: orderTotal,
        },
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppStatusBar lightContent={false} />

      {/* Modern Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Home', { activeTab: 'home' });
              }
            }}>
            <Icon color="#0F172A" name="arrow-back" size={20} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Review Cart</Text>
            {cartItems.length > 0 ? (
              <Text style={styles.headerSub}>
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in your cart
              </Text>
            ) : null}
          </View>
        </View>

        {cartItems.length > 0 ? (
          <View style={styles.etaPill}>
            <Icon color="#059669" name="flash" size={12} style={{ marginRight: 3 }} />
            <Text style={styles.etaPillText}>10-15 MINS</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        bounces={true}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + 120,
            ...(isTablet ? { alignSelf: 'center', maxWidth: pageMaxWidth, width: '100%' } : null),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Icon color="#EF4444" name="alert-circle" size={18} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Fetching fresh basket…</Text>
          </View>
        ) : cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon color="#94A3B8" name="cart-outline" size={52} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Explore fresh community groceries and farm produce
            </Text>
            <Pressable
              style={({ pressed }) => [styles.shopNowBtn, pressed && styles.btnPressed]}
              onPress={() => navigation.navigate('Home', { activeTab: 'home' })}>
              <Text style={styles.shopNowText}>Explore Products</Text>
              <Icon color="#FFFFFF" name="arrow-forward" size={16} style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
        ) : (
          <>
            {/* Quick Savings Celebration Bar */}
            {totalSavings > 0 ? (
              <View style={styles.savingsBanner}>
                <View style={styles.savingsIconWrap}>
                  <Icon color="#047857" name="sparkles" size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.savingsTitle}>
                    You are saving ₹{totalSavings} on this order!
                  </Text>
                  <Text style={styles.savingsSubtitle}>
                    Direct farm-fresh rates with zero middlemen
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Cart Items List */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.accentDot} />
                <Text style={styles.sectionTitle}>Items Added</Text>
                <Text style={styles.itemCountBadge}>{cartItems.length} SKUs</Text>
              </View>

              <View style={styles.itemsDivider} />

              {cartItems.map((item, index) => {
                const itemMrp = Math.round(item.price * 1.25);
                const discount = Math.max(Math.round(((itemMrp - item.price) / itemMrp) * 100), 10);
                const isLast = index === cartItems.length - 1;

                return (
                  <View
                    key={item.id}
                    style={[styles.itemRow, !isLast && styles.itemRowBorder]}>
                    {/* Product Image Stage */}
                    <View style={styles.imageStage}>
                      {item.image != null ? (
                        <Image
                          fadeDuration={0}
                          resizeMode="contain"
                          source={getImageSource(item.image)}
                          style={styles.productImg}
                        />
                      ) : (
                        <Icon color={colors.primary} name="basket-outline" size={32} />
                      )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.itemDetails}>
                      <View style={styles.nameRow}>
                        <Text numberOfLines={1} style={styles.itemName}>
                          {item.name}
                        </Text>
                        <Pressable
                          hitSlop={8}
                          style={styles.trashBtn}
                          disabled={updatingId === item.id}
                          onPress={() => handleRemove(item)}>
                          {updatingId === item.id ? (
                            <ActivityIndicator color="#94A3B8" size="small" />
                          ) : (
                            <Icon color="#94A3B8" name="trash-outline" size={17} />
                          )}
                        </Pressable>
                      </View>

                      {/* Weight / Unit Badge */}
                      <View style={styles.unitBadge}>
                        <Text style={styles.unitBadgeText}>
                          {item.unit ? `1 ${item.unit}` : '1 pack'}
                        </Text>
                      </View>

                      {/* Price & Stepper Row */}
                      <View style={styles.bottomPriceRow}>
                        <View style={styles.priceContainer}>
                          <View style={styles.mainPriceGroup}>
                            <Text style={styles.itemPrice}>₹{item.price}</Text>
                            <Text style={styles.itemMrp}>₹{itemMrp}</Text>
                          </View>
                          <Text style={styles.discountBadge}>{discount}% OFF</Text>
                        </View>

                        {/* Modern Tactile Stepper */}
                        <View style={styles.stepperContainer}>
                          <Pressable
                            accessibilityLabel="Decrease quantity"
                            hitSlop={6}
                            style={styles.stepperBtn}
                            disabled={updatingId === item.id}
                            onPress={() => handleDecrease(item)}>
                            <Icon color="#FFFFFF" name="remove" size={14} />
                          </Pressable>
                          <Text style={styles.stepperQty}>{item.quantity}</Text>
                          <Pressable
                            accessibilityLabel="Increase quantity"
                            hitSlop={6}
                            style={styles.stepperBtn}
                            disabled={updatingId === item.id}
                            onPress={() => handleIncrease(item)}>
                            <Icon color="#FFFFFF" name="add" size={14} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Delivery Schedule Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon color={colors.primary} name="calendar-outline" size={18} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Delivery Schedule</Text>
              </View>

              <View style={styles.itemsDivider} />

              {/* Day Selector */}
              <Text style={styles.subSectionLabel}>Select Day</Text>
              <View style={styles.slotRow}>
                {DELIVERY_SLOTS.map(slot => {
                  const active = deliverySlot === slot.id;
                  return (
                    <Pressable
                      key={slot.id}
                      style={[styles.slotTab, active && styles.slotTabActive]}
                      onPress={() => setDeliverySlot(slot.id)}>
                      <Icon
                        color={active ? colors.primary : '#64748B'}
                        name={active ? 'checkmark-circle' : slot.icon}
                        size={16}
                        style={{ marginRight: 6 }}
                      />
                      <View>
                        <Text style={[styles.slotTabText, active && styles.slotTabTextActive]}>
                          {slot.label}
                        </Text>
                        <Text style={styles.slotTabSub}>{slot.sublabel}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Time Slots */}
              <Text style={[styles.subSectionLabel, { marginTop: 14 }]}>Select Time Slot</Text>
              <View style={styles.timeGrid}>
                {DELIVERY_TIMES.map(time => {
                  const active = deliveryTime === time;
                  return (
                    <Pressable
                      key={time}
                      style={[styles.timePill, active && styles.timePillActive]}
                      onPress={() => setDeliveryTime(time)}>
                      <Icon
                        color={active ? '#065F46' : '#64748B'}
                        name="time-outline"
                        size={13}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.timeText, active && styles.timeTextActive]}>
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Delivery Instructions Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon color={colors.primary} name="document-text-outline" size={18} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Delivery Instructions</Text>
              </View>

              <View style={styles.itemsDivider} />

              {/* Quick Preset Chips */}
              <View style={styles.quickChipsRow}>
                {QUICK_INSTRUCTIONS.map(chip => {
                  const isSelected = instructions.includes(chip.label);
                  return (
                    <Pressable
                      key={chip.id}
                      style={[styles.quickChip, isSelected && styles.quickChipActive]}
                      onPress={() => handleToggleQuickInstruction(chip.label)}>
                      <Icon
                        color={isSelected ? '#065F46' : '#64748B'}
                        name={isSelected ? 'checkmark' : chip.icon}
                        size={13}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.quickChipText,
                          isSelected && styles.quickChipTextActive,
                        ]}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Freeform Notes Input */}
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="Any special notes for delivery partner (e.g. flat number, directions)..."
                placeholderTextColor="#94A3B8"
                style={styles.instructionInput}
                textAlignVertical="top"
                value={instructions}
                onChangeText={setInstructions}
              />
            </View>

            {/* Detailed Bill Summary Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon color="#0F172A" name="receipt-outline" size={18} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Bill Details</Text>
              </View>

              <View style={styles.itemsDivider} />

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total (MRP)</Text>
                <Text style={styles.billValueMuted}>₹{totalMrp.toFixed(2)}</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Product Discount</Text>
                <Text style={styles.billValueSavings}>- ₹{totalSavings.toFixed(2)}</Text>
              </View>

              <View style={styles.billRow}>
                <View style={styles.feeLabelWrap}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <View style={styles.freePill}>
                    <Text style={styles.freePillText}>FREE</Text>
                  </View>
                </View>
                <Text style={styles.billValueStrike}>₹25.00</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Handling & Packaging</Text>
                <Text style={styles.billValueMuted}>₹0.00</Text>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.billTotalRow}>
                <View>
                  <Text style={styles.toPayLabel}>To Pay</Text>
                  <Text style={styles.taxesIncluded}>Inclusive of all community taxes</Text>
                </View>
                <Text style={styles.toPayAmount}>₹{orderTotal.toFixed(2)}</Text>
              </View>

              {totalSavings > 0 ? (
                <View style={styles.billSavingsFooter}>
                  <Icon color="#047857" name="gift" size={14} style={{ marginRight: 6 }} />
                  <Text style={styles.billSavingsFooterText}>
                    Yay! You saved ₹{totalSavings.toFixed(0)} on this order
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Reassurance Footer Strip */}
            <View style={styles.reassuranceStrip}>
              <Icon color="#059669" name="shield-checkmark" size={16} />
              <Text style={styles.reassuranceText}>
                100% Freshness Guarantee • Return at doorstep if unsatisfied
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Bottom Sticky Checkout Bar */}
      {cartItems.length > 0 ? (
        <View
          style={[
            styles.floatingBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: horizontalPadding,
              ...(isTablet
                ? { alignSelf: 'center', maxWidth: pageMaxWidth, width: '100%' }
                : null),
            },
          ]}>
          <View style={styles.barSummary}>
            <Text style={styles.barTotal}>₹{orderTotal.toFixed(0)}</Text>
            <View style={styles.barSubRow}>
              <Text style={styles.barItemCount}>{totalItemCount} items</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.barViewBill}>TOTAL</Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Proceed to payment"
            accessibilityRole="button"
            disabled={isPlacingOrder}
            style={({ pressed }) => [styles.payButton, pressed && styles.payButtonPressed]}
            onPress={handlePlaceOrder}>
            {isPlacingOrder ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.payButtonText}>Proceed to Pay</Text>
                <Icon color="#FFFFFF" name="arrow-forward" size={17} style={{ marginLeft: 6 }} />
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerTextWrap: {
    marginLeft: 12,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  etaPill: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  etaPillText: {
    color: '#065F46',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingTop: 14,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 100,
    justifyContent: 'center',
    marginBottom: 18,
    width: 100,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  shopNowBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  shopNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  savingsBanner: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 12,
  },
  savingsIconWrap: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    marginRight: 12,
    width: 32,
  },
  savingsTitle: {
    color: '#065F46',
    fontSize: 13.5,
    fontWeight: '800',
  },
  savingsSubtitle: {
    color: '#047857',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  accentDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  itemCountBadge: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  itemsDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  itemRowBorder: {
    borderBottomColor: '#F8FAFC',
    borderBottomWidth: 1,
  },
  imageStage: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    height: 74,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 74,
  },
  productImg: {
    height: 62,
    width: 62,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  nameRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    paddingRight: 8,
  },
  trashBtn: {
    padding: 2,
  },
  unitBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unitBadgeText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '600',
  },
  bottomPriceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainPriceGroup: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 4,
  },
  itemPrice: {
    color: '#0F172A',
    fontSize: 15.5,
    fontWeight: '800',
  },
  itemMrp: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  stepperContainer: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    height: 32,
    justifyContent: 'space-between',
    minWidth: 72,
    paddingHorizontal: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  stepperBtn: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 22,
  },
  stepperQty: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  subSectionLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slotTab: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.2,
    flex: 1,
    flexDirection: 'row',
    padding: 10,
  },
  slotTabActive: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  slotTabText: {
    color: '#334155',
    fontSize: 13.5,
    fontWeight: '700',
  },
  slotTabTextActive: {
    color: colors.primaryDark,
  },
  slotTabSub: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timePillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  timeText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  timeTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  quickChipText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  quickChipTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  instructionInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 13,
    minHeight: 74,
    padding: 12,
  },
  billRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  billLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  feeLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  freePill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  freePillText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
  },
  billValueMuted: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  billValueSavings: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  billValueStrike: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  billDivider: {
    backgroundColor: '#E2E8F0',
    height: 1,
    marginVertical: 10,
  },
  billTotalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  toPayLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  taxesIncluded: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  toPayAmount: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  billSavingsFooter: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 7,
  },
  billSavingsFooterText: {
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '700',
  },
  reassuranceStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reassuranceText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    textAlign: 'center',
  },
  floatingBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    zIndex: 100,
  },
  barSummary: {
    justifyContent: 'center',
  },
  barTotal: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  barSubRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 1,
  },
  barItemCount: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
  },
  dotSeparator: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  barViewBill: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    elevation: 4,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    minWidth: 160,
    paddingHorizontal: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  payButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
