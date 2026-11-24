const THUMB_VEGETABLES = require('../../assests/vegetables.png');
const THUMB_FRUITS_APPLE = require('../../assests/fruits-apple.png');
const THUMB_CARROT = require('../../assests/carrot.png');
const THUMB_CAULIFLOWER = require('../../assests/califower.png');
const THUMB_GRAPES = require('../../assests/grapes.png');
const THUMB_DAIRY_MILK = require('../../assests/dairymilk.png');
const THUMB_WATERMELON = require('../../assests/watermelon-2.png');
const THUMB_SHAMPOO = require('../../assests/shampoo.png');

const DETAIL_VEGETABLES = require('../../assests/detail/vegetables.png');
const DETAIL_FRUITS_APPLE = require('../../assests/detail/fruits-apple.png');
const DETAIL_CARROT = require('../../assests/detail/carrot.png');
const DETAIL_CAULIFLOWER = require('../../assests/detail/califower.png');
const DETAIL_GRAPES = require('../../assests/detail/grapes.png');
const DETAIL_DAIRY_MILK = require('../../assests/detail/dairymilk.png');
const DETAIL_WATERMELON = require('../../assests/detail/watermelon-2.png');
const DETAIL_SHAMPOO = require('../../assests/detail/shampoo.png');

const DETAIL_TOMATO_F = require('../../assests/detail/Tomato_f.png');
const DETAIL_TOMATO_B = require('../../assests/detail/Tomato_b.png');
const DETAIL_TOMATO_S = require('../../assests/detail/Tomato_s.png');

const DETAIL_IMAGE_BY_THUMB = new Map<number, number>([
  [THUMB_VEGETABLES, DETAIL_VEGETABLES],
  [THUMB_FRUITS_APPLE, DETAIL_FRUITS_APPLE],
  [THUMB_CARROT, DETAIL_CARROT],
  [THUMB_CAULIFLOWER, DETAIL_CAULIFLOWER],
  [THUMB_GRAPES, DETAIL_GRAPES],
  [THUMB_DAIRY_MILK, DETAIL_DAIRY_MILK],
  [THUMB_WATERMELON, DETAIL_WATERMELON],
  [THUMB_SHAMPOO, DETAIL_SHAMPOO],
  [DETAIL_TOMATO_F, DETAIL_TOMATO_F],
  [DETAIL_TOMATO_B, DETAIL_TOMATO_B],
  [DETAIL_TOMATO_S, DETAIL_TOMATO_S],
]);

const GALLERY_BY_PRODUCT_ID: Record<string, number[]> = {
  'veg-tomato': [DETAIL_TOMATO_F, DETAIL_TOMATO_B, DETAIL_TOMATO_S],
};

export function getDetailImage(thumbnail: string | number | null | undefined): string | number | null {
  if (thumbnail == null || typeof thumbnail === 'string') {
    return thumbnail ?? null;
  }

  return DETAIL_IMAGE_BY_THUMB.get(thumbnail) ?? thumbnail;
}

/** Three gallery images for product detail (front / side / back when available). */
export function getProductGalleryImages(product: {
  id: string;
  name?: string;
  image?: string | number | null;
  galleryImages?: Array<string | number | null>;
}): Array<string | number | null> {
  if (product.galleryImages && product.galleryImages.length > 0) {
    return product.galleryImages;
  }

  const byId = GALLERY_BY_PRODUCT_ID[product.id];
  if (byId) {
    return byId;
  }

  if (/^tomato$/i.test(product.name?.trim() ?? '')) {
    return [DETAIL_TOMATO_F, DETAIL_TOMATO_B, DETAIL_TOMATO_S];
  }

  const primary = getDetailImage(product.image);
  return [primary, primary, primary];
}

export const DETAIL_IMAGE_ASSETS = [
  DETAIL_VEGETABLES,
  DETAIL_FRUITS_APPLE,
  DETAIL_CARROT,
  DETAIL_CAULIFLOWER,
  DETAIL_GRAPES,
  DETAIL_DAIRY_MILK,
  DETAIL_WATERMELON,
  DETAIL_SHAMPOO,
  DETAIL_TOMATO_F,
  DETAIL_TOMATO_B,
  DETAIL_TOMATO_S,
];

export const TOMATO_DETAIL_IMAGES = {
  front: DETAIL_TOMATO_F,
  bottom: DETAIL_TOMATO_B,
  side: DETAIL_TOMATO_S,
};
