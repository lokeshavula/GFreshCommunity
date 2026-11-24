import { Image } from 'react-native';

import { ALL_CATEGORY_ITEMS } from '../data/fallbackCategories';
import { ALL_CATEGORY_PRODUCTS } from '../data/categoryProducts';
import { HOME_CATEGORY_ASSETS } from '../data/homeCategories';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { DETAIL_IMAGE_ASSETS } from './detailImages';

function prefetchBundledImage(source: number): void {
  const resolved = Image.resolveAssetSource(source);
  if (resolved?.uri) {
    Image.prefetch(resolved.uri).catch(() => undefined);
  }
}

export function preloadAppAssets(): void {
  const sources = new Set<number>();

  ALL_CATEGORY_ITEMS.forEach(item => {
    if (typeof item.image === 'number') {
      sources.add(item.image);
    }
  });

  FALLBACK_PRODUCTS.forEach(product => {
    if (typeof product.image === 'number') {
      sources.add(product.image);
    }
  });

  HOME_CATEGORY_ASSETS.forEach(source => sources.add(source));

  ALL_CATEGORY_PRODUCTS.forEach(product => {
    if (typeof product.image === 'number') {
      sources.add(product.image);
    }
  });

  DETAIL_IMAGE_ASSETS.forEach(source => sources.add(source));

  sources.forEach(prefetchBundledImage);
}
