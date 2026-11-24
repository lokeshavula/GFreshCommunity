import { getSupabaseConfigError } from '../config/env';
import {
  FRUIT_PRODUCTS,
  VEGETABLE_PRODUCTS,
} from '../data/categoryProducts';
import { supabase } from '../lib/supabase';
import {
  PriceCategorySlug,
  Product,
  ProductImageSet,
  ProductRow,
} from '../types/product';
import { getErrorMessage } from '../utils/errorMessage';
import { PickedImage, uploadProductImage } from './storageService';

let imageCache: Map<string, ProductImageSet> | null = null;
let imageCacheAt = 0;
const CACHE_TTL_MS = 60_000;

function emptyImageSet(): ProductImageSet {
  return { main: null, front: null, side: null, back: null };
}

function rowToImageSet(row: ProductRow): ProductImageSet {
  return {
    main: row.image_url ?? null,
    front: row.image_front_url ?? null,
    side: row.image_side_url ?? null,
    back: row.image_back_url ?? null,
  };
}

export function clearProductImageCache(): void {
  imageCache = null;
  imageCacheAt = 0;
}

export async function fetchProductImageMap(force = false): Promise<Map<string, ProductImageSet>> {
  const now = Date.now();
  if (!force && imageCache && now - imageCacheAt < CACHE_TTL_MS) {
    return imageCache;
  }

  const map = new Map<string, ProductImageSet>();
  if (!supabase) {
    imageCache = map;
    imageCacheAt = now;
    return map;
  }

  const { data, error } = await supabase
    .from('products')
    .select('sku, image_url, image_front_url, image_side_url, image_back_url')
    .not('sku', 'is', null);

  if (error) {
    console.warn('[productImageService] fetchProductImageMap:', error.message);
    return imageCache ?? map;
  }

  for (const row of (data as ProductRow[]) ?? []) {
    if (row.sku) {
      map.set(row.sku, rowToImageSet(row));
    }
  }

  imageCache = map;
  imageCacheAt = now;
  return map;
}

export function applyProductImages(
  product: Product,
  images: Map<string, ProductImageSet>,
): Product {
  const set = images.get(product.id);
  if (!set) {
    return product;
  }

  const hasAny = Boolean(set.main || set.front || set.side || set.back);
  if (!hasAny) {
    return product;
  }

  const main = set.main ?? product.image;
  const next: Product = { ...product, image: main };

  if (set.front || set.side || set.back) {
    next.galleryImages = [
      set.front ?? main,
      set.side ?? main,
      set.back ?? main,
    ];
  }

  return next;
}

export function applyProductImagesList(
  products: Product[],
  images: Map<string, ProductImageSet>,
): Product[] {
  return products.map(product => applyProductImages(product, images));
}

export async function fetchAdminImageCatalog(
  category: PriceCategorySlug,
): Promise<Product[]> {
  const local = category === 'vegetables' ? VEGETABLE_PRODUCTS : FRUIT_PRODUCTS;
  const images = await fetchProductImageMap(true);
  return applyProductImagesList(local, images);
}

export async function fetchProductImageSet(sku: string): Promise<ProductImageSet> {
  const map = await fetchProductImageMap(true);
  return map.get(sku) ?? emptyImageSet();
}

export async function saveProductImages(
  product: Product,
  images: ProductImageSet,
): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const categorySlug: PriceCategorySlug | null = product.id.startsWith('veg-')
    ? 'vegetables'
    : product.id.startsWith('fruit-')
      ? 'fruits'
      : null;

  const payload = {
    sku: product.id,
    name: product.name,
    subtitle: product.subtitle,
    unit: product.unit,
    price: product.price,
    category_slug: categorySlug,
    is_active: true,
    image_url: images.main,
    image_front_url: images.front,
    image_side_url: images.side,
    image_back_url: images.back,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await supabase
    .from('products')
    .select('id')
    .eq('sku', product.id)
    .maybeSingle();

  if (findError) {
    throw new Error(
      getErrorMessage(
        findError,
        'Failed to save images. Run supabase/gfm_product_images.sql in Supabase.',
      ),
    );
  }

  if (existing) {
    const { error } = await supabase
      .from('products')
      .update({
        image_url: images.main,
        image_front_url: images.front,
        image_side_url: images.side,
        image_back_url: images.back,
        updated_at: payload.updated_at,
        is_active: true,
      })
      .eq('sku', product.id);

    if (error) {
      throw new Error(getErrorMessage(error, 'Failed to update product images.'));
    }
  } else {
    const { error } = await supabase.from('products').insert(payload);
    if (error) {
      throw new Error(
        getErrorMessage(
          error,
          'Failed to save product images. Run supabase/gfm_product_prices.sql and gfm_product_images.sql.',
        ),
      );
    }
  }

  clearProductImageCache();
}

export async function uploadAndAssignProductSlot(
  product: Product,
  slot: 'main' | 'front' | 'side' | 'back',
  picked: PickedImage,
  current: ProductImageSet,
): Promise<ProductImageSet> {
  const url = await uploadProductImage(picked, product.id, slot);
  return { ...current, [slot]: url };
}
