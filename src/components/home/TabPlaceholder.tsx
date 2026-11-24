import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useResponsiveLayout } from '../../utils/layout';

type Props = {
  title: string;
  icon: string;
  bottomPadding?: number;
};

export function TabPlaceholder({ title, icon, bottomPadding = 120 }: Props) {
  const { shellStyle } = useResponsiveLayout();

  return (
    <View
      className="flex-1 bg-white items-center justify-center"
      style={[{ paddingBottom: bottomPadding }, shellStyle('page')]}>
      <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Icon name={icon} size={36} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
      <Text className="text-sm text-gray-500 text-center">This section is coming soon.</Text>
    </View>
  );
}
