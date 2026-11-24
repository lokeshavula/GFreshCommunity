import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

const SERVICES = [
  { icon: 'bicycle-outline', label: 'Free Delivery', tone: '#ECFDF3' },
  { icon: 'leaf-outline', label: '100% Fresh', tone: '#FFF7ED' },
  { icon: 'time-outline', label: '30 Min', tone: '#ECFDF3' },
];

export function HomeServiceStrip() {
  const { shellStyle } = useResponsiveLayout();

  return (
    <View style={[{ marginTop: 20 }, shellStyle('wide')]}>
      <View style={styles.strip}>
        {SERVICES.map((service, index) => (
          <View
            key={service.label}
            style={[styles.item, index > 0 ? styles.itemBorder : null]}>
            <View style={[styles.iconWrap, { backgroundColor: service.tone }]}>
              <Icon color={colors.primary} name={service.icon} size={16} />
            </View>
            <Text numberOfLines={1} style={styles.label}>
              {service.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  itemBorder: {
    borderLeftColor: '#E2E8F0',
    borderLeftWidth: 1,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  label: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
