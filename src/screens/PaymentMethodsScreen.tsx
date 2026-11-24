import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethods'>;

type Method = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  tone: string;
};

const METHODS: Method[] = [
  {
    id: 'upi',
    title: 'UPI',
    subtitle: 'GPay · PhonePe · Paytm',
    icon: 'phone-portrait-outline',
    tone: '#ECFDF3',
  },
  {
    id: 'card',
    title: 'Cards',
    subtitle: 'Visa · Mastercard · RuPay',
    icon: 'card-outline',
    tone: '#EFF6FF',
  },
  {
    id: 'apple',
    title: 'Apple Pay / Google Pay',
    subtitle: 'Express wallet checkout',
    icon: 'logo-apple',
    tone: '#F8FAFC',
  },
  {
    id: 'rfid',
    title: 'RF ID Card',
    subtitle: 'Community mart wallet balance',
    icon: 'radio-outline',
    tone: '#F0FDF4',
  },
  {
    id: 'cod',
    title: 'Cash on Delivery',
    subtitle: 'Pay when order arrives',
    icon: 'cash-outline',
    tone: '#FFF7ED',
  },
];

export function PaymentMethodsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [defaultMethod, setDefaultMethod] = useState('upi');
  const contentStyle = useCenteredContentStyle({ paddingBottom: insets.bottom + 28 });

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Choose how you prefer to pay"
        title="Payment methods"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={[{ paddingTop: 20 }, contentStyle]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Icon color={colors.accent} name="shield-checkmark" size={18} />
          <Text className="ml-2 flex-1 text-sm text-white">
            Payments are encrypted. Set a default method for faster checkout.
          </Text>
        </View>

        <View style={styles.listCard}>
          {METHODS.map((method, index) => {
            const active = defaultMethod === method.id;
            return (
              <Pressable
                key={method.id}
                style={[styles.row, index > 0 && styles.rowBorder]}
                onPress={() => {
                  setDefaultMethod(method.id);
                  if (method.id === 'rfid') {
                    navigation.navigate('RfIdCard');
                  }
                }}>
                <View style={[styles.iconWrap, { backgroundColor: method.tone }]}>
                  <Icon color={colors.primary} name={method.icon} size={18} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-slate-900">{method.title}</Text>
                  <Text className="mt-0.5 text-xs text-slate-500">{method.subtitle}</Text>
                </View>
                {active ? (
                  <View style={styles.defaultPill}>
                    <Text className="text-[10px] font-bold text-primary-dark">DEFAULT</Text>
                  </View>
                ) : (
                  <Icon color="#CBD5E1" name="ellipse-outline" size={20} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => Alert.alert('Add method', 'Card and UPI linking will connect to your payment gateway next.')}>
          <Icon color={colors.primary} name="add-circle-outline" size={18} />
          <Text className="ml-2 text-sm font-bold text-primary">Add new payment method</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  banner: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 18,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 14,
  },
  listCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  defaultPill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 14,
  },
});
