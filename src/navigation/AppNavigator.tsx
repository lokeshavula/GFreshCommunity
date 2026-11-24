import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AccountScreen } from '../screens/AccountScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { AdminDailyPricesScreen } from '../screens/AdminDailyPricesScreen';
import { AdminDemandPollScreen } from '../screens/AdminDemandPollScreen';
import { AdminFreshArrivalsScreen } from '../screens/AdminFreshArrivalsScreen';
import { AdminProductImageEditScreen } from '../screens/AdminProductImageEditScreen';
import { AdminProductImagesScreen } from '../screens/AdminProductImagesScreen';
import { AdminLoginActivityScreen } from '../screens/AdminLoginActivityScreen';
import { AdminLoginScreen } from '../screens/AdminLoginScreen';
import { CartScreen } from '../screens/CartScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { CategoryItemsScreen } from '../screens/CategoryItemsScreen';
import { DeliveryAddressScreen } from '../screens/DeliveryAddressScreen';
import { DeliveryScheduleScreen } from '../screens/DeliveryScheduleScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { HelpSupportScreen } from '../screens/HelpSupportScreen';
import { HouseholdScreen } from '../screens/HouseholdScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LegalInfoScreen } from '../screens/LegalInfoScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { OrderHistoryScreen } from '../screens/OrderHistoryScreen';
import { OrderSuccessScreen } from '../screens/OrderSuccessScreen';
import { PaymentMethodsScreen } from '../screens/PaymentMethodsScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { RfIdCardScreen } from '../screens/RfIdCardScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import { AdminHouseholdDetailScreen } from '../screens/AdminHouseholdDetailScreen';
import { TodayPricesScreen } from '../screens/TodayPricesScreen';
import { TrackOrderScreen } from '../screens/TrackOrderScreen';
import { AdminUserReviewScreen } from '../screens/AdminUserReviewScreen';
import { PendingApprovalScreen } from '../screens/PendingApprovalScreen';
import { AccountRejectedScreen } from '../screens/AccountRejectedScreen';
import { AccountSuspendedScreen } from '../screens/AccountSuspendedScreen';
import { getCurrentAdmin } from '../services/adminService';
import { getCurrentUser, refreshUserFromServer } from '../services/userService';
import { getRouteForUser } from '../utils/authGuard';
import { CheckoutDraft, PaymentMethodId } from '../types/payment';
import { GfmOrder } from '../types/gfm';
import { Product } from '../types/product';
import { colors } from '../theme/colors';

export type LegalInfoType = 'privacy' | 'terms' | 'about';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PendingApproval: undefined;
  AccountRejected: undefined;
  AccountSuspended: undefined;
  Home: { activeTab?: 'home' | 'chat' | 'favourite' | 'cart' | 'order' | 'account'; fromAdmin?: boolean } | undefined;
  ProductDetail: {
    product: Product;
  };
  Cart: undefined;
  Payment: {
    checkout: CheckoutDraft;
  };
  OrderSuccess: {
    orderId: string;
    total: number;
    paymentMethod: PaymentMethodId;
    transactionId: string;
    deliverySlot: string;
    deliveryTime: string;
    blockNumber?: string;
    flatNo?: string;
    orderedAt?: string;
    status?: string;
  };
  TrackOrder: {
    orderId: string;
    deliverySlot?: string;
    deliveryTime?: string;
    blockNumber?: string;
    flatNo?: string;
    orderedAt?: string;
    status?: string;
    initialOrder?: GfmOrder;
  };
  RfIdCard: undefined;
  OrderHistory: undefined;
  EditProfile: undefined;
  DeliveryAddress: undefined;
  DeliverySchedule: undefined;
  Household: undefined;
  PaymentMethods: undefined;
  Security: undefined;
  HelpSupport: undefined;
  Notifications: undefined;
  LegalInfo: { type: LegalInfoType };
  Categories: undefined;
  CategoryItems: {
    sectionId: string;
    sectionName: string;
  };
  TodayPrices: undefined;
  Account: undefined;
  AdminLogin: undefined;
  AdminDashboard: undefined;
  AdminDailyPrices: undefined;
  AdminDemandPoll: undefined;
  AdminFreshArrivals: undefined;
  AdminProductImages: undefined;
  AdminProductImageEdit: { product: Product };
  AdminUserReview: { userId: string };
  AdminHouseholdDetail: { householdId: string };
  AdminLoginActivity: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveInitialRoute() {
      const cached = await getCurrentUser();
      if (cached) {
        const user = await refreshUserFromServer(cached.id);
        if (!isMounted) {
          return;
        }
        setInitialRoute(getRouteForUser(user ?? cached));
        return;
      }

      const admin = await getCurrentAdmin();
      if (!isMounted) {
        return;
      }

      if (admin) {
        setInitialRoute('AdminDashboard');
        return;
      }

      setInitialRoute('Login');
    }

    resolveInitialRoute();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          animation: 'fade_from_bottom',
          headerShown: false,
        }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen
          name="PendingApproval"
          component={PendingApprovalScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="AccountRejected"
          component={AccountRejectedScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="AccountSuspended"
          component={AccountSuspendedScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
        <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
        <Stack.Screen name="RfIdCard" component={RfIdCardScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="DeliveryAddress" component={DeliveryAddressScreen} />
        <Stack.Screen name="DeliverySchedule" component={DeliveryScheduleScreen} />
        <Stack.Screen name="Household" component={HouseholdScreen} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
        <Stack.Screen name="Security" component={SecurityScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="LegalInfo" component={LegalInfoScreen} />
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="CategoryItems" component={CategoryItemsScreen} />
        <Stack.Screen
          name="TodayPrices"
          component={TodayPricesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen
          name="AdminDailyPrices"
          component={AdminDailyPricesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminDemandPoll"
          component={AdminDemandPollScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminFreshArrivals"
          component={AdminFreshArrivalsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminProductImages"
          component={AdminProductImagesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminProductImageEdit"
          component={AdminProductImageEditScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminUserReview"
          component={AdminUserReviewScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminHouseholdDetail"
          component={AdminHouseholdDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="AdminLoginActivity" component={AdminLoginActivityScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
