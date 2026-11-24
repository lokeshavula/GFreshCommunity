import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;

const FAQS = [
  {
    q: 'How does community mart delivery work?',
    a: 'Orders are packed at G-Fresh Mart and delivered to your block and flat in the selected slot.',
  },
  {
    q: 'Can I pay with RF ID card?',
    a: 'Yes. Open Account → RF ID Card to check balance, recharge, and use it at checkout.',
  },
  {
    q: 'How do I track my order?',
    a: 'Use Order History or the Orders tab to follow packing, ready, arriving, and delivered stages.',
  },
];

const CONTACTS = [
  { id: 'call', title: 'Call support', subtitle: '8008216667', icon: 'call-outline', action: 'tel:8008216667' },
  { id: 'mail', title: 'Email us', subtitle: 'support@gfreshmart.app', icon: 'mail-outline', action: 'mailto:support@gfreshmart.app' },
  { id: 'chat', title: 'WhatsApp', subtitle: 'Quick community help', icon: 'logo-whatsapp', action: 'https://wa.me/918008216667' },
];

export function HelpSupportScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({ paddingBottom: insets.bottom + 28 });

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="We’re here for your community orders"
        title="Help & support"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={[{ paddingTop: 20 }, contentStyle]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text className="text-base font-bold text-slate-900">Need help?</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Reach the G-Fresh support team for delivery, payments, or RF ID card questions.
          </Text>
        </View>

        <Text className="mb-3 text-sm font-bold text-slate-900">Contact</Text>
        <View style={styles.listCard}>
          {CONTACTS.map((item, index) => (
            <Pressable
              key={item.id}
              style={[styles.row, index > 0 && styles.rowBorder]}
              onPress={() => Linking.openURL(item.action)}>
              <View style={styles.iconWrap}>
                <Icon color={colors.primary} name={item.icon} size={18} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-slate-900">{item.title}</Text>
                <Text className="mt-0.5 text-xs text-slate-500">{item.subtitle}</Text>
              </View>
              <Icon color="#94A3B8" name="chevron-forward" size={16} />
            </Pressable>
          ))}
        </View>

        <Text className="mb-3 mt-5 text-sm font-bold text-slate-900">FAQs</Text>
        <View style={{ gap: 10 }}>
          {FAQS.map(item => (
            <View key={item.q} style={styles.faqCard}>
              <Text className="text-sm font-bold text-slate-900">{item.q}</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-500">{item.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  heroCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
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
  rowBorder: { borderTopColor: '#F1F5F9', borderTopWidth: 1 },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  faqCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
});
