import { getSupabaseConfigError } from '../config/env';
import { ALL_CATEGORY_PRODUCTS } from '../data/categoryProducts';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { supabase } from '../lib/supabase';
import { AddToCartInput, CartItem, CartItemRow } from '../types/cart';
import { getErrorMessage } from '../utils/errorMessage';
import { getCatalogPriceMap } from './productService';
import { getCurrentUser, requireActiveUser } from './userService';

const LOCAL_PRODUCTS = [...FALLBACK_PRODUCTS, ...ALL_CATEGORY_PRODUCTS];

function resolveCatalogImage(productId: string): string | number | null {
  const match = LOCAL_PRODUCTS.find(product => product.id === productId);
  return match?.image ?? null;
}

function toImageUrl(image: string | number | null | undefined): string | null {
  return typeof image === 'string' ? image : null;
}

function mapCartRow(row: CartItemRow): CartItem {
  const catalogImage = resolveCatalogImage(row.product_id);
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    subtitle: row.subtitle ?? '',
    price: Number(row.price),
    unit: row.unit || 'pack',
    image: row.image_url ?? catalogImage,
    quantity: row.quantity,
  };
}

async function requireUserId(): Promise<string> {
  const user = await requireActiveUser();
  return user.id;
}

export async function fetchCartItems(): Promise<CartItem[]> {
  if (!supabase) {
    return [];
  }

  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('gfm_cart_items')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[cartService] fetchCartItems:', error.message);
    throw new Error(
      getErrorMessage(error, 'Failed to load cart. Run supabase/gfm_cart.sql in Supabase.'),
    );
  }

  return ((data as CartItemRow[]) ?? []).map(mapCartRow);
}

export async function fetchCartCount(): Promise<number> {
  const items = await fetchCartItems().catch(() => []);
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export async function getCartItemByProductId(productId: string): Promise<CartItem | null> {
  if (!supabase) {
    return null;
  }

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('gfm_cart_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCartRow(data as CartItemRow);
}

export async function addToCart(input: AddToCartInput): Promise<CartItem> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  const userId = await requireUserId();
  const quantity = Math.max(1, input.quantity ?? 1);
  const imageUrl = toImageUrl(input.image);

  const { data: existing, error: existingError } = await supabase
    .from('gfm_cart_items')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', input.productId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      getErrorMessage(existingError, 'Failed to update cart. Run supabase/gfm_cart.sql in Supabase.'),
    );
  }

  if (existing) {
    const nextQty = (existing as CartItemRow).quantity + quantity;
    const { data, error } = await supabase
      .from('gfm_cart_items')
      .update({
        quantity: nextQty,
        price: input.price,
        name: input.name,
        subtitle: input.subtitle?.trim() ?? '',
        unit: input.unit ?? 'pack',
        image_url: imageUrl ?? (existing as CartItemRow).image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (existing as CartItemRow).id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(getErrorMessage(error, 'Failed to update cart.'));
    }

    return mapCartRow(data as CartItemRow);
  }

  const { data, error } = await supabase
    .from('gfm_cart_items')
    .insert({
      user_id: userId,
      product_id: input.productId,
      name: input.name,
      subtitle: input.subtitle?.trim() ?? '',
      price: input.price,
      unit: input.unit ?? 'pack',
      image_url: imageUrl,
      quantity,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Failed to add item to cart.'));
  }

  return mapCartRow(data as CartItemRow);
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<CartItem | null> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  await requireUserId();

  if (quantity <= 0) {
    await removeCartItem(cartItemId);
    return null;
  }

  const { data, error } = await supabase
    .from('gfm_cart_items')
    .update({
      quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartItemId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Failed to update quantity.'));
  }

  return mapCartRow(data as CartItemRow);
}

export async function removeCartItem(cartItemId: string): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  await requireUserId();

  const { error } = await supabase.from('gfm_cart_items').delete().eq('id', cartItemId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Failed to remove item.'));
  }
}

export async function clearCart(): Promise<void> {
  if (!supabase) {
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const { error } = await supabase.from('gfm_cart_items').delete().eq('user_id', user.id);

  if (error) {
    throw new Error(getErrorMessage(error, 'Failed to clear cart.'));
  }
}

/** Refresh cart line prices from current catalog (daily produce prices). */
export async function refreshCartPricesFromCatalog(): Promise<CartItem[]> {
  const client = supabase;
  if (!client) {
    return [];
  }

  const items = await fetchCartItems();
  if (items.length === 0) {
    return items;
  }

  const prices = await getCatalogPriceMap(true);
  const now = new Date().toISOString();

  await Promise.all(
    items.map(async item => {
      const nextPrice = prices.get(item.productId);
      if (nextPrice == null || Number.isNaN(nextPrice) || nextPrice === item.price) {
        return;
      }
      await client
        .from('gfm_cart_items')
        .update({ price: nextPrice, updated_at: now })
        .eq('id', item.id);
    }),
  );

  return fetchCartItems();
}
