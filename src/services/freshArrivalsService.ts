import { supabase } from '../lib/supabase';
import {
  CreateFreshArrivalInput,
  FreshArrivalItem,
  FreshArrivalRow,
} from '../types/freshArrival';
import { FALLBACK_FRESH_ARRIVALS } from '../data/fallbackFreshArrivals';
import { getErrorMessage } from '../utils/errorMessage';
import { PickedImage, uploadProductImage } from './storageService';

function mapRow(row: FreshArrivalRow): FreshArrivalItem {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    categoryTag: row.category_tag,
    categoryEmoji: row.category_emoji || '✨',
    imageUrl: row.image_url,
    price: row.price ? Number(row.price) : undefined,
    unit: row.unit || 'pack',
    productId: row.product_id ?? null,
    stockQuantityLabel: row.stock_quantity_label ?? null,
    badgeText: row.badge_text || 'LIVE • JUST ARRIVED',
    arrivedAt: row.arrived_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    isActive: row.is_active ?? true,
  };
}

export async function fetchActiveFreshArrivals(): Promise<FreshArrivalItem[]> {
  if (!supabase) {
    return FALLBACK_FRESH_ARRIVALS;
  }

  try {
    const { data, error } = await supabase
      .from('gfm_fresh_arrivals')
      .select('*')
      .eq('is_active', true)
      .order('arrived_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('[freshArrivalsService] fetchActiveFreshArrivals query error:', error.message);
      return FALLBACK_FRESH_ARRIVALS;
    }

    if (!data || data.length === 0) {
      return FALLBACK_FRESH_ARRIVALS;
    }

    return (data as FreshArrivalRow[]).map(mapRow);
  } catch (err) {
    console.warn('[freshArrivalsService] failed, using fallback:', err);
    return FALLBACK_FRESH_ARRIVALS;
  }
}

export async function createFreshArrival(
  input: CreateFreshArrivalInput,
): Promise<FreshArrivalItem> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    category_tag: input.categoryTag.toLowerCase(),
    category_emoji: input.categoryEmoji || '✨',
    image_url: input.imageUrl.trim(),
    price: input.price ? Number(input.price) : null,
    unit: input.unit || 'pack',
    product_id: input.productId || null,
    stock_quantity_label: input.stockQuantityLabel?.trim() || null,
    badge_text: input.badgeText || 'LIVE • JUST ARRIVED',
    arrived_at: input.arrivedAt || new Date().toISOString(),
    is_active: true,
  };

  const { data, error } = await supabase
    .from('gfm_fresh_arrivals')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not post fresh stock arrival.'));
  }

  return mapRow(data as FreshArrivalRow);
}

export async function deleteFreshArrival(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('gfm_fresh_arrivals')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete arrival post.'));
  }
}

export async function uploadArrivalPhoto(image: PickedImage, categoryTag: string): Promise<string> {
  return uploadProductImage(image, `arrival-${categoryTag}`, 'main');
}

/**
 * Generates human readable relative time like:
 * "Uploaded 2 minutes ago", "Uploaded 15 minutes ago", "Uploaded 2 hours ago", "Just now"
 */
export function formatUploadedAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'Uploaded just now';
  }
  if (diffMinutes === 1) {
    return 'Uploaded 1 minute ago';
  }
  if (diffMinutes < 60) {
    return `Uploaded ${diffMinutes} minutes ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) {
    return 'Uploaded 1 hour ago';
  }
  if (diffHours < 24) {
    return `Uploaded ${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Uploaded ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Formats arrival clock time like:
 * "Arrived at 8:30 AM" or "Today at 8:30 AM"
 */
export function formatArrivalClockTime(isoDate: string): string {
  const date = new Date(isoDate);
  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `Arrived at ${timeStr}`;
}

/**
 * Formats short badge for stories circle (e.g. "2m ago", "1h ago", "8:30 AM")
 */
export function formatShortArrivalTag(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'NOW';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return 'Yesterday';
}
