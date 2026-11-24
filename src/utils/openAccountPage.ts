import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AccountDestination } from '../components/home/AccountTabContent';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = {
  navigate: NativeStackNavigationProp<RootStackParamList>['navigate'];
};

export function openAccountPage(navigation: Nav, destination: AccountDestination) {
  switch (destination.screen) {
    case 'LegalInfo':
      navigation.navigate('LegalInfo', { type: destination.type });
      break;
    case 'OrderHistory':
      navigation.navigate('OrderHistory');
      break;
    case 'RfIdCard':
      navigation.navigate('RfIdCard');
      break;
    case 'EditProfile':
      navigation.navigate('EditProfile');
      break;
    case 'DeliveryAddress':
      navigation.navigate('DeliveryAddress');
      break;
    case 'Household':
      navigation.navigate('Household');
      break;
    case 'PaymentMethods':
      navigation.navigate('PaymentMethods');
      break;
    case 'Security':
      navigation.navigate('Security');
      break;
    case 'HelpSupport':
      navigation.navigate('HelpSupport');
      break;
    case 'Notifications':
      navigation.navigate('Notifications');
      break;
    default:
      break;
  }
}
