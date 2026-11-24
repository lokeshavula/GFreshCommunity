import { getSupabaseConfigError } from '../config/env';
import {
  ALL_CATEGORY_PRODUCTS,
  FRUIT_PRODUCTS,
  getCategoryProducts,
  VEGETABLE_PRODUCTS,
} from '../data/categoryProducts';
import { FALLBACK_POPULAR_PRODUCTS, FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { supabase } from '../lib/supabase';
import { PriceCategorySlug, Product, ProductRow } from '../types/product';
import { getErrorMessage } from '../utils/errorMessage';
import { toPriceDateKey } from '../utils/priceDate';
import {
  applyProductImages,
  applyProductImagesList,
  fetchProductImageMap,
} from './productImageService';

const LOCAL_CATALOG: Product[] = [...FALLBACK_PRODUCTS, ...ALL_CATEGORY_PRODUCTS];
const PRICE_CATEGORIES: PriceCategorySlug[] = ['vegetables', 'fruits'];

type PriceCacheEntry = {
  at: number;
  map: Map<string, number>;
};

const priceCacheByDate = new Map<string, PriceCacheEntry>();
const CACHE_TTL_MS = 60_000;

function localById(id: string): Product | undefined {
  return LOCAL_CATALOG.find(product => product.id === id);
}

function mergePrice(product: Product, prices: Map<string, number>): Product {
  const next = prices.get(product.id);
  if (next == null || Number.isNaN(next)) {
    return product;
  }
  return { ...product, price: next };
}

function applyPrices(products: Product[], prices: Map<string, number>): Product[] {
  return products.map(product => mergePrice(product, prices));
}

export function clearProductPriceCache(): void {
  priceCacheByDate.clear();
}

async function fetchBaseCatalogPriceMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!supabase) {
    return map;
  }

  const { data, error } = await supabase
    .from('products')
    .select('sku, price')
    .eq('is_active', true)
    .not('sku', 'is', null);

  if (error) {
    console.warn('[productService] fetchBaseCatalogPriceMap:', error.message);
    return map;
  }

  for (const row of (data as Pick<ProductRow, 'sku' | 'price'>[]) ?? []) {
    if (row.sku) {
      map.set(row.sku, Number(row.price));
    }
  }
  return map;
}

async function fetchDailyPriceMap(priceDate: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!supabase) {
    return map;
  }

  const { data, error } = await supabase
    .from('gfm_product_daily_prices')
    .select('sku, price')
    .eq('price_date', priceDate);

  if (error) {
    if (error.code !== 'PGRST205') {
      console.warn('[productService] fetchDailyPriceMap:', error.message);
    }
    return map;
  }

  for (const row of (data as { sku: string; price: number }[]) ?? []) {
    if (row.sku) {
      map.set(row.sku, Number(row.price));
    }
  }
  return map;
}

/** Base catalog price, overridden by day-specific prices when present. */
async function fetchPriceMapForDate(
  priceDate: string,
  force = false,
): Promise<Map<string, number>> {
  const now = Date.now();
  const cached = priceCacheByDate.get(priceDate);
  if (!force && cached && now - cached.at < CACHE_TTL_MS) {
    return cached.map;
  }

  const base = await fetchBaseCatalogPriceMap();
  const daily = await fetchDailyPriceMap(priceDate);
  daily.forEach((price, sku) => base.set(sku, price));

  priceCacheByDate.set(priceDate, { at: now, map: base });
  return base;
}

async function fetchPriceMap(force = false): Promise<Map<string, number>> {
  return fetchPriceMapForDate(toPriceDateKey(), force);
}

export async function fetchPopularProducts(): Promise<Product[]> {
  const [prices, images] = await Promise.all([fetchPriceMap(), fetchProductImageMap()]);
  return applyProductImagesList(applyPrices(FALLBACK_POPULAR_PRODUCTS, prices), images);
}

export async function fetchRelatedProducts(excludeId: string): Promise<Product[]> {
  const [prices, images] = await Promise.all([fetchPriceMap(), fetchProductImageMap()]);
  return applyProductImagesList(
    applyPrices(
      LOCAL_CATALOG.filter(product => product.id !== excludeId),
      prices,
    ),
    images,
  );
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const local = localById(id);
  if (!local) {
    return null;
  }
  const [prices, images] = await Promise.all([fetchPriceMap(), fetchProductImageMap()]);
  return applyProductImages(mergePrice(local, prices), images);
}

export async function fetchProductsByCategory(categoryId: string): Promise<Product[] | null> {
  const local = getCategoryProducts(categoryId);
  if (!local) {
    return null;
  }
  const [prices, images] = await Promise.all([fetchPriceMap(), fetchProductImageMap()]);
  return applyProductImagesList(applyPrices(local, prices), images);
}

export async function fetchAdminPriceProducts(
  category: PriceCategorySlug,
  priceDate: string = toPriceDateKey(),
): Promise<Product[]> {
  const local = category === 'vegetables' ? VEGETABLE_PRODUCTS : FRUIT_PRODUCTS;
  const prices = await fetchPriceMapForDate(priceDate, true);
  return applyPrices(local, prices);
}

export async function fetchTodayProducePrices(
  category?: PriceCategorySlug,
): Promise<Product[]> {
  const [prices, images] = await Promise.all([
    fetchPriceMap(true),
    fetchProductImageMap(true),
  ]);
  const list =
    category === 'vegetables'
      ? VEGETABLE_PRODUCTS
      : category === 'fruits'
        ? FRUIT_PRODUCTS
        : [...VEGETABLE_PRODUCTS, ...FRUIT_PRODUCTS];
  return applyProductImagesList(applyPrices(list, prices), images);
}

export async function updateProductPrice(
  sku: string,
  price: number,
  priceDate: string = toPriceDateKey(),
): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const nextPrice = Number(price);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    throw new Error('Enter a valid price greater than 0.');
  }

  const local = localById(sku);
  const categorySlug: PriceCategorySlug | null = sku.startsWith('veg-')
    ? 'vegetables'
    : sku.startsWith('fruit-')
      ? 'fruits'
      : null;

  const { error: dailyError } = await supabase.from('gfm_product_daily_prices').upsert(
    {
      sku,
      price_date: priceDate,
      price: nextPrice,
      category_slug: categorySlug,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sku,price_date' },
  );

  if (dailyError) {
    throw new Error(
      getErrorMessage(
        dailyError,
        'Failed to save daily price. Run supabase/gfm_product_daily_prices.sql in Supabase.',
      ),
    );
  }

  // Keep products.price in sync when editing today so older paths stay correct
  if (priceDate === toPriceDateKey()) {
    const { data: existing, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .maybeSingle();

    if (findError) {
      throw new Error(
        getErrorMessage(
          findError,
          'Failed to update catalog price. Run supabase/gfm_product_prices.sql in Supabase.',
        ),
      );
    }

    if (existing) {
      const { error } = await supabase
        .from('products')
        .update({
          price: nextPrice,
          updated_at: new Date().toISOString(),
          is_active: true,
        })
        .eq('sku', sku);

      if (error) {
        throw new Error(getErrorMessage(error, 'Failed to update catalog price.'));
      }
    } else {
      const { error } = await supabase.from('products').insert({
        sku,
        name: local?.name ?? sku,
        subtitle: local?.subtitle ?? '',
        price: nextPrice,
        unit: local?.unit ?? 'kg',
        category_slug: categorySlug,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(
          getErrorMessage(
            error,
            'Failed to save catalog price. Run supabase/gfm_product_prices.sql in Supabase.',
          ),
        );
      }
    }
  }

  clearProductPriceCache();
}

export function isPriceManagedCategory(categoryId: string): boolean {
  return PRICE_CATEGORIES.includes(categoryId as PriceCategorySlug);
}

export async function getCatalogPriceMap(force = false): Promise<Map<string, number>> {
  return fetchPriceMap(force);
}
