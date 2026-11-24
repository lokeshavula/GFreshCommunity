export type ItemIconMeta = {
  icon: string;
  color: string;
  backgroundColor: string;
};

const DEFAULT_ICON: ItemIconMeta = {
  icon: 'cube-outline',
  color: '#64748B',
  backgroundColor: '#F1F5F9',
};

export const CATEGORY_ICON_META: Record<string, ItemIconMeta> = {
  vegetables: { icon: 'leaf-outline', color: '#16A34A', backgroundColor: '#DCFCE7' },
  bakery: { icon: 'cafe-outline', color: '#D97706', backgroundColor: '#FEF3C7' },
  oil: { icon: 'water-outline', color: '#CA8A04', backgroundColor: '#FEF9C3' },
  instant: { icon: 'flash-outline', color: '#EA580C', backgroundColor: '#FFEDD5' },
  'dry-fruits': { icon: 'ellipse-outline', color: '#B45309', backgroundColor: '#FEF3C7' },
  kitchenware: { icon: 'construct-outline', color: '#475569', backgroundColor: '#E2E8F0' },
  masala: { icon: 'flame-outline', color: '#DC2626', backgroundColor: '#FEE2E2' },
  dairy: { icon: 'egg-outline', color: '#2563EB', backgroundColor: '#DBEAFE' },
  fruits: { icon: 'nutrition-outline', color: '#E11D48', backgroundColor: '#FFE4E6' },
  pan: { icon: 'leaf-outline', color: '#059669', backgroundColor: '#D1FAE5' },
  buns: { icon: 'cafe-outline', color: '#B45309', backgroundColor: '#FEF3C7' },
  chips: { icon: 'fast-food-outline', color: '#F59E0B', backgroundColor: '#FEF3C7' },
  drinks: { icon: 'wine-outline', color: '#7C3AED', backgroundColor: '#EDE9FE' },
  sweets: { icon: 'heart-outline', color: '#DB2777', backgroundColor: '#FCE7F3' },
  'tea-coffee': { icon: 'cafe-outline', color: '#92400E', backgroundColor: '#FEF3C7' },
  noodles: { icon: 'restaurant-outline', color: '#C2410C', backgroundColor: '#FFEDD5' },
  sauces: { icon: 'color-fill-outline', color: '#BE123C', backgroundColor: '#FFE4E6' },
  chocolate: { icon: 'heart-outline', color: '#7C2D12', backgroundColor: '#FFEDD5' },
  'ice-cream': { icon: 'snow-outline', color: '#0284C7', backgroundColor: '#E0F2FE' },
};

export const SECTION_ICON_META: Record<string, ItemIconMeta> = {
  grocery: { icon: 'basket-outline', color: '#16A34A', backgroundColor: '#DCFCE7' },
  snacks: { icon: 'pizza-outline', color: '#F59E0B', backgroundColor: '#FEF3C7' },
};

const PREFIX_TO_CATEGORY: Record<string, string> = {
  veg: 'vegetables',
  bakery: 'bakery',
  oil: 'oil',
  instant: 'instant',
  dry: 'dry-fruits',
  kitchen: 'kitchenware',
  masala: 'masala',
  dairy: 'dairy',
  fruit: 'fruits',
  pan: 'pan',
  buns: 'buns',
  chips: 'chips',
  drinks: 'drinks',
  sweets: 'sweets',
  tea: 'tea-coffee',
  coffee: 'tea-coffee',
  noodles: 'noodles',
  sauce: 'sauces',
  choco: 'chocolate',
  ice: 'ice-cream',
};

const PRODUCT_ICON_OVERRIDES: Record<string, string> = {
  '1': 'nutrition-outline',
  '2': 'nutrition-outline',
  '3': 'heart-outline',
  '4': 'nutrition-outline',
  '5': 'water-outline',
  'veg-broccoli': 'leaf-outline',
  'veg-carrot': 'nutrition-outline',
  'veg-cauliflower': 'leaf-outline',
  'veg-tomato': 'nutrition-outline',
  'veg-onion': 'nutrition-outline',
  'veg-potato': 'nutrition-outline',
  'veg-brinjal': 'nutrition-outline',
  'veg-cabbage': 'leaf-outline',
  'veg-capsicum': 'nutrition-outline',
  'veg-green-chilli': 'flame-outline',
  'veg-red-chilli': 'flame-outline',
  'veg-ginger': 'flame-outline',
  'veg-garlic': 'flame-outline',
  'veg-beetroot': 'nutrition-outline',
  'veg-spinach': 'leaf-outline',
  'veg-methi': 'leaf-outline',
  'veg-coriander': 'leaf-outline',
  'veg-mint': 'leaf-outline',
  'veg-curry-leaves': 'leaf-outline',
  'veg-lady-finger': 'nutrition-outline',
  'veg-bottle-gourd': 'nutrition-outline',
  'veg-bitter-gourd': 'nutrition-outline',
  'veg-ridge-gourd': 'nutrition-outline',
  'veg-pumpkin': 'nutrition-outline',
  'veg-sweet-corn': 'nutrition-outline',
  'veg-green-peas': 'nutrition-outline',
  'veg-french-beans': 'nutrition-outline',
  'veg-cluster-beans': 'nutrition-outline',
  'veg-drumstick': 'nutrition-outline',
  'veg-radish': 'nutrition-outline',
  'veg-cucumber': 'nutrition-outline',
  'veg-lettuce': 'leaf-outline',
  'veg-mushroom': 'nutrition-outline',
  'veg-spring-onion': 'nutrition-outline',
  'veg-sweet-potato': 'nutrition-outline',
  'veg-turnip': 'nutrition-outline',
  'veg-zucchini': 'nutrition-outline',
  'veg-colocasia': 'nutrition-outline',
  'veg-raw-banana': 'nutrition-outline',
  'veg-lemon': 'sunny-outline',
  'fruit-apple': 'nutrition-outline',
  'fruit-grapes': 'nutrition-outline',
  'fruit-watermelon': 'nutrition-outline',
  'fruit-banana': 'nutrition-outline',
  'fruit-mango': 'nutrition-outline',
  'fruit-papaya': 'nutrition-outline',
  'fruit-pomegranate': 'nutrition-outline',
  'fruit-orange': 'sunny-outline',
  'fruit-mosambi': 'sunny-outline',
  'fruit-pineapple': 'nutrition-outline',
  'fruit-kiwi': 'nutrition-outline',
  'fruit-strawberry': 'nutrition-outline',
  'fruit-blueberry': 'nutrition-outline',
  'fruit-pear': 'nutrition-outline',
  'fruit-guava': 'nutrition-outline',
  'fruit-chiku': 'nutrition-outline',
  'fruit-dragon': 'nutrition-outline',
  'fruit-coconut': 'nutrition-outline',
  'fruit-lemon': 'sunny-outline',
  'fruit-mixed': 'nutrition-outline',
  'choco-dairy-milk': 'heart-outline',
  'kitchen-pressure-cooker': 'flame-outline',
  'kitchen-gas-lighter': 'flash-outline',
  'drinks-energy': 'flash-outline',
  'drinks-sports': 'flash-outline',
  'drinks-mineral-water': 'water-outline',
  'drinks-coconut-water': 'water-outline',
  'tea-milk-shake': 'cafe-outline',
  'tea-vanilla-shake': 'cafe-outline',
  'tea-strawberry-shake': 'cafe-outline',
};

type KeywordRule = { pattern: RegExp; icon: string };

const KEYWORD_ICON_RULES: KeywordRule[] = [
  { pattern: /shampoo|pantene|hair/i, icon: 'water-outline' },
  { pattern: /broccoli|cauliflower|cabbage|lettuce|spinach|methi|coriander|mint|curry.?leaf|palak|leaves/i, icon: 'leaf-outline' },
  { pattern: /carrot|beetroot|radish|turnip|zucchini|gourd|brinjal|bhindi|arbi|lauki|karela|turai/i, icon: 'nutrition-outline' },
  { pattern: /tomato|onion|potato|capsicum|pumpkin|cucumber|mushroom|colocasia|banana/i, icon: 'nutrition-outline' },
  { pattern: /chilli|chili|ginger|garlic|pepper|masala|spice|clove|cinnamon|cardamom|jeera|cumin|turmeric|kasuri/i, icon: 'flame-outline' },
  { pattern: /corn|peas|beans|drumstick|vermicelli/i, icon: 'nutrition-outline' },
  { pattern: /lemon|orange|mosambi|citrus|jaljeera/i, icon: 'sunny-outline' },
  { pattern: /apple|grape|watermelon|mango|papaya|pomegranate|pineapple|kiwi|strawberry|blueberry|pear|guava|chiku|dragon.?fruit|coconut|fruit|mixed.?fruit/i, icon: 'nutrition-outline' },
  { pattern: /biscuit|cookie|cracker|rusk|khakhra|oreo|parle|marie/i, icon: 'cube-outline' },
  { pattern: /bread|pav|bun|loaf|toast|croissant|donut|muffin|baguette|roll|focaccia|pita|tortilla|garlic.?bread|hot.?dog|burger.?bun|sourdough/i, icon: 'cafe-outline' },
  { pattern: /cake|pastry|brownie|truffle|wafer/i, icon: 'heart-outline' },
  { pattern: /oil|ghee|dalda|vanaspati|olive|mustard|sesame|coconut.?oil/i, icon: 'water-outline' },
  { pattern: /noodle|maggi|ramen|yippee|pasta|spaghetti|macaroni|hakka|lasagna|fusilli|mac.?&.?cheese|cup.?noodle/i, icon: 'restaurant-outline' },
  { pattern: /soup|manchow|hot.?&.?sour/i, icon: 'cafe-outline' },
  { pattern: /oat|poha|upma|idli|dosa|biryani|paratha|samosa|ready.?to.?eat|instant|frozen/i, icon: 'flash-outline' },
  { pattern: /almond|cashew|walnut|pistachio|raisin|date|apricot|fig|prune|cranber|badam|kishmish|khajoor|anjeer/i, icon: 'ellipse-outline' },
  { pattern: /cornflake|muesli|dalia|sabudana|quinoa|cereal|dry.?fruit/i, icon: 'grid-outline' },
  { pattern: /non.?stick|kadai|tawa|pressure.?cooker|knife|board|ladle|spatula|strainer|grater|peeler|container|lunch.?box|bottle|glass|plate|foil|kitchen/i, icon: 'construct-outline' },
  { pattern: /milk|curd|paneer|butter|cheese|cream|lassi|buttermilk|yogurt|condensed|egg/i, icon: 'egg-outline' },
  { pattern: /chip|kurkure|bingo|pringles|doritos|cheetos|namkeen|bhujia|mixture|sev|makhana|popcorn|snack|wafers/i, icon: 'fast-food-outline' },
  { pattern: /cola|juice|drink|soda|water|coffee|tea|shake|energy|sports|aam.?panna|iced.?tea/i, icon: 'wine-outline' },
  { pattern: /ladoo|gulab|rasgulla|barfi|kaju|jalebi|halwa|peda|soan|rasmalai|kheer|sweet|pinni|mysoor|jamun/i, icon: 'heart-outline' },
  { pattern: /nescafe|bru|cappuccino|darjeeling|herbal.?tea|filter.?coffee|decaf/i, icon: 'cafe-outline' },
  { pattern: /ketchup|sauce|mayo|jam|honey|spread|nutella|vinegar|chutney|peanut.?butter|schezwan|soya/i, icon: 'color-fill-outline' },
  { pattern: /chocolate|choco|kitkat|snickers|ferrero|lindt|bournville|dairy.?milk|five.?star|perk|munch|gems|amul.?chocolate/i, icon: 'heart-outline' },
  { pattern: /ice.?cream|kulfi|cornetto|magnum|gelato|sundae|cassata|sugar.?free/i, icon: 'snow-outline' },
  { pattern: /pan.?masala|gutka|supari|mukhwas|saunf|betel|chuna|kattha|mouth.?freshener|rajni|vimal|kamla/i, icon: 'leaf-outline' },
  { pattern: /rice|dal/i, icon: 'restaurant-outline' },
];

function inferCategoryId(productId: string): string | undefined {
  const prefix = productId.split('-')[0];
  return PREFIX_TO_CATEGORY[prefix];
}

function matchKeywordIcon(text: string): string | undefined {
  for (const rule of KEYWORD_ICON_RULES) {
    if (rule.pattern.test(text)) {
      return rule.icon;
    }
  }
  return undefined;
}

export function getCategoryIconMeta(categoryId: string): ItemIconMeta {
  return CATEGORY_ICON_META[categoryId] ?? DEFAULT_ICON;
}

export function getSectionIconMeta(sectionId: string): ItemIconMeta {
  return SECTION_ICON_META[sectionId] ?? DEFAULT_ICON;
}

export function getProductIconMeta(
  product: { id: string; name: string },
  categoryId?: string,
): ItemIconMeta {
  const overrideIcon = PRODUCT_ICON_OVERRIDES[product.id];
  const resolvedCategoryId = categoryId ?? inferCategoryId(product.id);
  const categoryMeta = resolvedCategoryId ? getCategoryIconMeta(resolvedCategoryId) : DEFAULT_ICON;

  const iconName =
    overrideIcon ??
    matchKeywordIcon(`${product.id} ${product.name}`) ??
    categoryMeta.icon;

  return {
    icon: iconName,
    color: categoryMeta.color,
    backgroundColor: categoryMeta.backgroundColor,
  };
}

export function getCategoryIconName(categoryId: string): string {
  return getCategoryIconMeta(categoryId).icon;
}

export function getProductIconName(
  product: { id: string; name: string },
  categoryId?: string,
): string {
  return getProductIconMeta(product, categoryId).icon;
}

/** Full icon reference for all 19 shop categories */
export const ALL_CATEGORY_ICONS = Object.entries(CATEGORY_ICON_META).map(([id, meta]) => ({
  id,
  ...meta,
}));
