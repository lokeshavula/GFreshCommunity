const DEFAULT_PRODUCT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';

const LOCAL_ASSETS: Record<string, number> = {
  'carrot.png': require('../../assests/carrot.png'),
  'dairymilk.png': require('../../assests/dairymilk.png'),
  'grapes.png': require('../../assests/grapes.png'),
  'shampoo.png': require('../../assests/shampoo.png'),
  'watermelon-2.png': require('../../assests/watermelon-2.png'),
  'califower.png': require('../../assests/califower.png'),
  'biscuits&bakery.png': require('../../assests/biscuits&bakery.png'),
  'oil.png': require('../../assests/oil.png'),
  'pan.png': require('../../assests/pan.png'),
  'dryfruits.png': require('../../assests/dryfruits.png'),
  'fruits.png': require('../../assests/fruits.png'),
  'masala.png': require('../../assests/masala.png'),
  'eggs.png': require('../../assests/eggs.png'),
  'chips.png': require('../../assests/chips.png'),
  'drinks.png': require('../../assests/drinks.png'),
  'sweets.png': require('../../assests/sweets.png'),
  'coffee.png': require('../../assests/coffee.png'),
  'breads.png': require('../../assests/breads.png'),
  'sauces.png': require('../../assests/sauces.png'),
  'instant.png': require('../../assests/instant.png'),
  'icecream.png': require('../../assests/icecream.png'),
  'kitchenware.png': require('../../assests/kitchenware.png'),
  'buns.png': require('../../assests/buns.png'),
  'vegetables.png': require('../../assests/vegetables.png'),
  'fruits-apple.png': require('../../assests/fruits-apple.png'),
};

export function resolveImage(
  imageUrl: string | null | undefined,
  placeholder: string | number | null = null,
): string | number | null {
  if (!imageUrl) {
    return placeholder;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  const filename = imageUrl.includes('/') ? imageUrl.split('/').pop()! : imageUrl;
  return LOCAL_ASSETS[filename] ?? imageUrl;
}

export function resolveProductImage(imageUrl: string | null | undefined): string | number {
  return resolveImage(imageUrl, DEFAULT_PRODUCT_PLACEHOLDER) ?? DEFAULT_PRODUCT_PLACEHOLDER;
}
