import { CategoryItem } from '../types/category';

import { ALL_CATEGORY_ITEMS } from './fallbackCategories';

export type HomeCategoryItem = CategoryItem & {
  shortName: string;
};

const HOME_CATEGORY_IMAGE_OVERRIDES: Record<string, number> = {
  vegetables: require('../../assests/vegetables.png'),
  fruits: require('../../assests/fruits-apple.png'),
};

const HOME_SHORT_NAMES: Record<string, string> = {
  vegetables: 'Veggies',
  fruits: 'Fruits',
  bakery: 'Bakery',
  oil: 'Oil',
  instant: 'Instant',
  'dry-fruits': 'Dry Fruits',
  kitchenware: 'Kitchen',
  masala: 'Masala',
  dairy: 'Dairy',
  pan: 'Pan',
  buns: 'Breads',
  chips: 'Snacks',
  drinks: 'Drinks',
  sweets: 'Sweets',
  'tea-coffee': 'Tea',
  noodles: 'Pasta',
  sauces: 'Sauces',
  chocolate: 'Choco',
  'ice-cream': 'Ice Cream',
};

const HOME_CATEGORY_ORDER = ['vegetables', 'fruits'];

function toHomeCategory(item: CategoryItem): HomeCategoryItem {
  return {
    ...item,
    image: HOME_CATEGORY_IMAGE_OVERRIDES[item.id] ?? item.image,
    shortName: HOME_SHORT_NAMES[item.id] ?? item.name.split(' ')[0],
  };
}

export const HOME_CATEGORIES: HomeCategoryItem[] = [
  ...ALL_CATEGORY_ITEMS.filter(item => HOME_CATEGORY_ORDER.includes(item.id)).map(toHomeCategory),
  ...ALL_CATEGORY_ITEMS.filter(item => !HOME_CATEGORY_ORDER.includes(item.id)).map(toHomeCategory),
];

export const HOME_CAROUSEL_CATEGORIES = HOME_CATEGORIES.slice(0, 5);

export const HOME_CATEGORY_ASSETS = Object.values(HOME_CATEGORY_IMAGE_OVERRIDES);
