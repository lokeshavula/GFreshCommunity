import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'LegalInfo'>;

const CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How we handle your data',
    sections: [
      {
        heading: 'Information we collect',
        body: 'We collect your name, mobile number, block, flat details, and order information to deliver groceries within your community.',
      },
      {
        heading: 'How we use it',
        body: 'Your details are used for account access, order delivery, RF ID wallet activity, and customer support.',
      },
      {
        heading: 'Data protection',
        body: 'We store account and order data securely and do not sell personal information to third parties.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Community mart usage terms',
    sections: [
      {
        heading: 'Service scope',
        body: 'G-Fresh Mart provides grocery ordering and community delivery from the mart to your registered flat.',
      },
      {
        heading: 'Orders & delivery',
        body: 'Delivery slots are subject to mart availability. Please keep your block and flat details accurate.',
      },
      {
        heading: 'Payments',
        body: 'You can pay using UPI, cards, wallets, RF ID card balance, or cash on delivery where available.',
      },
    ],
  },
  about: {
    title: 'About G-Fresh Mart',
    subtitle: 'Version 1.0.0',
    sections: [
      {
        heading: 'Our mission',
        body: 'Bring fresh groceries from your community mart to every flat with fast, reliable delivery.',
      },
      {
        heading: 'What we offer',
        body: 'Order now, plan ahead, RF ID wallet, live order tracking, and secure checkout for residents.',
      },
      {
        heading: 'Built for community',
        body: 'Designed for gated communities and apartment living — from mart packing to your door.',
      },
    ],
  },
} as const;

export function LegalInfoScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const page = CONTENT[route.params.type];
  const contentStyle = useCenteredContentStyle({ paddingBottom: insets.bottom + 28 });

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle={page.subtitle}
        title={page.title}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={[{ paddingTop: 20 }, contentStyle]}
        showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12 }}>
          {page.sections.map(section => (
            <View key={section.heading} style={styles.card}>
              <Text className="text-sm font-bold text-slate-900">{section.heading}</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-500">{section.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  card: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
});
