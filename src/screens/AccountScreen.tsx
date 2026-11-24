import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { AccountTabContent } from '../components/home/AccountTabContent';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useResponsiveLayout } from '../utils/layout';
import { openAccountPage } from '../utils/openAccountPage';

type AccountNavigation = NativeStackNavigationProp<RootStackParamList, 'Account'>;

export function AccountScreen() {
  const navigation = useNavigation<AccountNavigation>();
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <View className="pb-3 flex-row items-center" style={shellStyle('page')}>
        <Pressable
          className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#000" />
        </Pressable>
        <Text className="ml-3 text-xl font-bold text-gray-900">Account</Text>
      </View>

      <AccountTabContent
        bottomPadding={32}
        onOpenPage={destination => openAccountPage(navigation, destination)}
        onSignIn={() => navigation.navigate('Login')}
        onLogout={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        }
      />
    </View>
  );
}
