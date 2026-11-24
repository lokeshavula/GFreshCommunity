import { CategoryItem, CategorySection } from '../types/category';

export const FALLBACK_CATEGORY_SECTIONS: CategorySection[] = [
  {
    id: 'grocery',
    title: 'Grocery & Kitchen',
    items: [
      { id: 'vegetables', name: 'Vegetables', image: require('../../assests/califower.png') },
      { id: 'bakery', name: 'Bakery & Biscuits', image: require('../../assests/biscuits&bakery.png') },
      { id: 'oil', name: 'Refined Oil & Ghee', image: require('../../assests/oil.png') },
      { id: 'instant', name: 'Instant Food', image: require('../../assests/instant.png') },
      { id: 'dry-fruits', name: 'Dry Fruits & Cerals', image: require('../../assests/dryfruits.png') },
      { id: 'kitchenware', name: 'Kitchenware', image: require('../../assests/kitchenware.png') },
      { id: 'masala', name: 'Masala Spices & More', image: require('../../assests/masala.png') },
      { id: 'dairy', name: 'Dairy Bread & Eggs', image: require('../../assests/eggs.png') },
      { id: 'fruits', name: 'Fresh Fruits', image: require('../../assests/fruits.png') },
      { id: 'pan', name: 'Pan Corner', image: require('../../assests/pan.png') },
      { id: 'buns', name: 'Buns & Bread', image: require('../../assests/buns.png') },
    ],
  },
  {
    id: 'snacks',
    title: 'Snacks & Drinks',
    items: [
      { id: 'chips', name: 'Chips & Namkeen', image: require('../../assests/chips.png') },
      { id: 'drinks', name: 'Drinks & Juices', image: require('../../assests/drinks.png') },
      { id: 'sweets', name: 'Sweets & Chocolates', image: require('../../assests/sweets.png') },
      { id: 'tea-coffee', name: 'Tea, Coffee & Milk Shakes', image: require('../../assests/coffee.png') },
      { id: 'noodles', name: 'Noodles & Pasta', image: require('../../assests/breads.png') },
      { id: 'sauces', name: 'Sauces & Spreads', image: require('../../assests/sauces.png') },
      { id: 'chocolate', name: 'Chocolate Bars', image: require('../../assests/dairymilk.png') },
      { id: 'ice-cream', name: 'Ice Cream', image: require('../../assests/icecream.png') },
    ],
  },
];

export const ALL_CATEGORY_ITEMS: CategoryItem[] = FALLBACK_CATEGORY_SECTIONS.flatMap(
  section => section.items,
);
