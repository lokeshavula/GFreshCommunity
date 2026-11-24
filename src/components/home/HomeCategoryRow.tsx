import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { CategoryImage } from '../CategoryImage';
import { HomeCategoryItem } from '../../data/homeCategories';
import { getCategoryIconMeta } from '../../utils/itemIcons';
import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type HomeCategoryRowProps = {
  categories: HomeCategoryItem[];
  onCategoryPress: (category: HomeCategoryItem) => void;
  onAllPress: () => void;
};

export function HomeCategoryRow({ categories, onCategoryPress, onAllPress }: HomeCategoryRowProps) {
  const { shellStyle, deviceSize } = useResponsiveLayout();
  const tileSize = deviceSize === 'largeTablet' ? 100 : deviceSize === 'tablet' ? 92 : deviceSize === 'compact' ? 64 : 72;
  const imageSize = deviceSize === 'largeTablet' ? 80 : deviceSize === 'tablet' ? 74 : deviceSize === 'compact' ? 50 : 58;

  return (
    <View style={[styles.wrap, shellStyle('wide')]}>
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-slate-900">Shop by Category</Text>
          <Text className="text-xs text-slate-500">Fresh picks for your kitchen</Text>
        </View>
        <Pressable onPress={onAllPress}>
          <Text className="text-sm font-semibold text-primary">See all</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.content}
        showsHorizontalScrollIndicator={false}>
        {categories.map(category => {
          const iconMeta = getCategoryIconMeta(category.id);
          return (
          <Pressable
            key={category.id}
            className="items-center mr-4"
            onPress={() => onCategoryPress(category)}>
            <View style={[styles.categoryCard, { height: tileSize, width: tileSize }]}>
              <CategoryImage
                image={category.image}
                resizeMode="contain"
                style={{ borderRadius: 18, height: imageSize, width: imageSize }}
                iconSize={22}
                iconName={iconMeta.icon}
                iconColor={iconMeta.color}
                iconBackgroundColor={iconMeta.backgroundColor}
              />
            </View>
            <Text
              className="mt-2 text-center text-[12px] font-semibold text-slate-700"
              numberOfLines={1}
              style={{ width: tileSize + 8 }}>
              {category.shortName}
            </Text>
          </Pressable>
        );})}

        <Pressable className="items-center mr-2" onPress={onAllPress}>
          <View style={[styles.allCard, { height: tileSize, width: tileSize }]}>
            <Icon
              color={colors.primaryDark}
              name="grid-outline"
              size={deviceSize === 'tablet' || deviceSize === 'largeTablet' ? 30 : 26}
            />
          </View>
          <Text className="mt-2 text-center text-[12px] font-semibold text-slate-700">All</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    marginTop: 20,
    paddingTop: 4,
  },
  content: {
    paddingBottom: 4,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E8F5EC',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 4,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  allCard: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 22,
    elevation: 4,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
});
