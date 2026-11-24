import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { ALL_CATEGORY_PRODUCTS } from '../data/categoryProducts';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { Product } from '../types/product';
import { getErrorMessage } from '../utils/errorMessage';
import { getCatalogPriceMap } from './productService';

export interface BulkCatalogProduct {
  id: string;
  name: string;
  subtitle?: string;
  unit: string;
  retailPrice: number;
  wholesalePrice: number;
  minBulkQty: number;
  isBulkAvailable: boolean;
  categorySlug?: string;
}

const STORAGE_KEY = 'gfm_bulk_available_catalog_cache';

const ALL_PRODUCTS_CATALOG: Product[] = [...FALLBACK_PRODUCTS, ...ALL_CATEGORY_PRODUCTS];

/**
 * Fetch all catalog items with their Admin Bulk Availability status
 */
export async function fetchAllBulkCatalogProducts(): Promise<BulkCatalogProduct[]> {
  const priceMap = await getCatalogPriceMap().catch(() => new Map<string, number>());

  // 1. Try to fetch from Supabase table `gfm_bulk_available_products`
  let dbMap = new Map<string, { isBulk: boolean; wholesale: number; minQty: number }>();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('gfm_bulk_available_products')
        .select('*');

      if (!error && data && data.length > 0) {
        data.forEach((row: any) => {
          dbMap.set(row.product_id || row.id || row.sku, {
            isBulk: Boolean(row.is_active ?? row.is_bulk_available ?? true),
            wholesale: Number(row.wholesale_price || row.bulk_price || 0),
            minQty: Number(row.min_bulk_qty || 2),
          });
        });
      }
    } catch (e) {
      console.warn('[adminBulkCatalogService] Supabase fetch error:', e);
    }
  }

  // 2. Fallback to AsyncStorage cache if DB table not yet created
  if (dbMap.size === 0) {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: BulkCatalogProduct[] = JSON.parse(cached);
        parsed.forEach(p => {
          dbMap.set(p.id, {
            isBulk: p.isBulkAvailable,
            wholesale: p.wholesalePrice,
            minQty: p.minBulkQty,
          });
        });
      }
    } catch {
      // ignore
    }
  }

  // Map over unique catalog products
  const seen = new Set<string>();
  const list: BulkCatalogProduct[] = [];

  for (const prod of ALL_PRODUCTS_CATALOG) {
    if (seen.has(prod.id)) continue;
    seen.add(prod.id);

    const retail = priceMap.get(prod.id) ?? prod.price;
    const dbConfig = dbMap.get(prod.id);

    const isBulk = dbConfig ? dbConfig.isBulk : false;
    const wholesale = dbConfig?.wholesale && dbConfig.wholesale > 0
      ? dbConfig.wholesale
      : Math.round(retail * 0.8); // 20% default wholesale margin
    const minQty = dbConfig?.minQty || 2;

    list.push({
      id: prod.id,
      name: prod.name,
      subtitle: prod.subtitle,
      unit: prod.unit || 'kg',
      retailPrice: retail,
      wholesalePrice: wholesale,
      minBulkQty: minQty,
      isBulkAvailable: isBulk,
      categorySlug: prod.categorySlug,
    });
  }

  return list;
}

/**
 * Fetch ONLY the products where Admin declared Bulk Order Available (isBulkAvailable = true)
 * This is used for Customers in Chat & Split order pickers!
 */
export async function fetchAdminDeclaredBulkProducts(): Promise<BulkCatalogProduct[]> {
  const all = await fetchAllBulkCatalogProducts();
  return all.filter(p => p.isBulkAvailable);
}

/**
 * Admin toggles or updates bulk availability & wholesale price for a product
 */
export async function setProductBulkAvailability(
  productId: string,
  isBulkAvailable: boolean,
  wholesalePrice?: number,
  minBulkQty: number = 2,
): Promise<boolean> {
  const all = await fetchAllBulkCatalogProducts();
  const target = all.find(p => p.id === productId);
  if (!target) return false;

  const finalWholesale = wholesalePrice ?? (target.wholesalePrice || Math.round(target.retailPrice * 0.8));

  // 1. Save to Supabase if configured
  if (supabase) {
    try {
      const { error } = await supabase
        .from('gfm_bulk_available_products')
        .upsert(
          {
            product_id: productId,
            name: target.name,
            unit: target.unit,
            retail_price: target.retailPrice,
            wholesale_price: finalWholesale,
            min_bulk_qty: minBulkQty,
            is_active: isBulkAvailable,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'product_id' },
        );

      if (error) {
        console.warn('[adminBulkCatalogService] Supabase upsert error:', error.message);
      }
    } catch (e) {
      console.warn('[adminBulkCatalogService] Supabase upsert error:', e);
    }
  }

  // 2. Cache updated catalog in AsyncStorage
  target.isBulkAvailable = isBulkAvailable;
  target.wholesalePrice = finalWholesale;
  target.minBulkQty = minBulkQty;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }

  return true;
}
