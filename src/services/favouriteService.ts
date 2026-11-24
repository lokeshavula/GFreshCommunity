import { getSupabaseConfigError } from '../config/env';
import { ALL_CATEGORY_PRODUCTS } from '../data/categoryProducts';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { supabase } from '../lib/supabase';
import { FavouriteItem, FavouriteProductInput, FavouriteRow } from '../types/favourite';
import { Product } from '../types/product';
import { getErrorMessage } from '../utils/errorMessage';
import { getCatalogPriceMap } from './productService';
import { fetchProductImageMap } from './productImageService';
import { getCurrentUser, requireActiveUser } from './userService';

const LOCAL_PRODUCTS = [...FALLBACK_PRODUCTS, ...ALL_CATEGORY_PRODUCTS];

function resolveCatalogImage(productId: string): string | number | null {
  const match = LOCAL_PRODUCTS.find(product => product.id === productId);
  return match?.image ?? null;
}

function toImageUrl(image: string | number | null | undefined): string | null {
  return typeof image === 'string' ? image : null;
}

function mapFavouriteRow(row: FavouriteRow, priceOverride?: number): FavouriteItem {
  const catalogImage = resolveCatalogImage(row.product_id);
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    subtitle: row.subtitle ?? '',
    price: priceOverride ?? Number(row.price),
    unit: row.unit || 'pack',
    image: row.image_url ?? catalogImage,
  };
}

export function favouriteToProduct(item: FavouriteItem): Product {
  return {
    id: item.productId,
    name: item.name,
    subtitle: item.subtitle,
    price: item.price,
    unit: item.unit,
    image: item.image,
  };
}

export async function fetchFavourites(): Promise<FavouriteItem[]> {
  if (!supabase) {
    return [];
  }

  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('gfm_favourites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[favouriteService] fetchFavourites:', error.message);
    throw new Error(
      getErrorMessage(
        error,
        'Failed to load favourites. Run supabase/gfm_favourites.sql in Supabase.',
      ),
    );
  }

  const rows = (data as FavouriteRow[]) ?? [];
  const [prices, images] = await Promise.all([
    getCatalogPriceMap().catch(() => new Map<string, number>()),
    fetchProductImageMap().catch(() => new Map()),
  ]);

  return rows.map(row => {
    const live = prices.get(row.product_id);
    const item = mapFavouriteRow(
      row,
      live != null && !Number.isNaN(live) ? live : undefined,
    );
    const remoteMain = images.get(row.product_id)?.main;
    if (remoteMain) {
      return { ...item, image: remoteMain };
    }
    return item;
  });
}

export async function isProductFavourite(productId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const user = await getCurrentUser();
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('gfm_favourites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    console.warn('[favouriteService] isProductFavourite:', error.message);
    return false;
  }

  return Boolean(data);
}

export async function addFavourite(input: FavouriteProductInput): Promise<FavouriteItem> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const user = await requireActiveUser();
  const imageUrl = toImageUrl(input.image);

  const { data: existing } = await supabase
    .from('gfm_favourites')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', input.productId)
    .maybeSingle();

  if (existing) {
    return mapFavouriteRow(existing as FavouriteRow);
  }

  const { data, error } = await supabase
    .from('gfm_favourites')
    .insert({
      user_id: user.id,
      product_id: input.productId,
      name: input.name,
      subtitle: input.subtitle?.trim() ?? '',
      price: input.price,
      unit: input.unit ?? 'pack',
      image_url: imageUrl,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(
      getErrorMessage(
        error,
        'Failed to save favourite. Run supabase/gfm_favourites.sql in Supabase.',
      ),
    );
  }

  return mapFavouriteRow(data as FavouriteRow);
}

export async function removeFavourite(productId: string): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const user = await requireActiveUser();

  const { error } = await supabase
    .from('gfm_favourites')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', productId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Failed to remove favourite.'));
  }
}

export async function toggleFavourite(
  input: FavouriteProductInput,
): Promise<{ isFavourite: boolean }> {
  const exists = await isProductFavourite(input.productId);
  if (exists) {
    await removeFavourite(input.productId);
    return { isFavourite: false };
  }
  await addFavourite(input);
  return { isFavourite: true };
}
