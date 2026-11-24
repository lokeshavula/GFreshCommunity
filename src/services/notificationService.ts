import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchOrdersForUser } from './orderService';
import { GfmOrder } from '../types/gfm';
import { getTrackStepLabel } from '../utils/orderTracking';

export type NotificationKind = 'order' | 'offer' | 'system';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string;
  icon: string;
  accent: string;
  soft: string;
  orderId?: string;
  trackOrder?: {
    orderId: string;
    deliverySlot: string;
    deliveryTime: string;
    blockNumber?: string;
    flatNo?: string;
    orderedAt?: string;
    status?: string;
  };
};

const READ_KEY = 'gfm_notification_read_ids';

const OFFERS: AppNotification[] = [
  {
    id: 'offer-weekend-produce',
    kind: 'offer',
    title: 'Weekend fresh picks',
    message: 'Save 10% on fruits and vegetables this Saturday & Sunday at LG Enterprises.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    icon: 'leaf-outline',
    accent: '#15803D',
    soft: '#ECFDF3',
  },
  {
    id: 'offer-bakery',
    kind: 'offer',
    title: 'New bakery arrivals',
    message: 'Fresh buns, breads and cookies are now available in the community mart.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    icon: 'cafe-outline',
    accent: '#C2410C',
    soft: '#FFF7ED',
  },
];

function orderNotification(order: GfmOrder): AppNotification {
  const status = (order.status || 'placed').toLowerCase();
  const label = getTrackStepLabel(status);
  const isDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled';

  return {
    id: `order-${order.id}-${status}`,
    kind: 'order',
    title: isDelivered
      ? 'Order delivered'
      : isCancelled
        ? 'Order cancelled'
        : `Order ${label.toLowerCase()}`,
    message: isDelivered
      ? `${order.orderId} was handed over at Block ${order.blockNumber}, Flat ${order.flatNo}.`
      : isCancelled
        ? `${order.orderId} was cancelled. Contact support if you need help.`
        : `${order.orderId} is ${label.toLowerCase()}. Slot ${order.deliverySlot} · ${order.deliveryTime}.`,
    createdAt: order.statusUpdatedAt || order.orderedAt,
    icon: isDelivered ? 'checkmark-circle' : isCancelled ? 'close-circle' : 'receipt-outline',
    accent: isDelivered ? '#15803D' : isCancelled ? '#B91C1C' : '#0A5C3E',
    soft: isDelivered ? '#ECFDF3' : isCancelled ? '#FEF2F2' : '#EFF6FF',
    orderId: order.orderId,
    trackOrder: {
      orderId: order.orderId,
      deliverySlot: order.deliverySlot,
      deliveryTime: order.deliveryTime,
      blockNumber: order.blockNumber,
      flatNo: order.flatNo,
      orderedAt: order.orderedAt,
      status: order.status,
    },
  };
}

export async function getReadNotificationIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const current = await getReadNotificationIds();
  current.add(id);
  await AsyncStorage.setItem(READ_KEY, JSON.stringify([...current]));
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(READ_KEY, JSON.stringify(ids));
}

export async function fetchNotificationsForUser(userId: string | null): Promise<AppNotification[]> {
  const system: AppNotification = {
    id: 'system-welcome',
    kind: 'system',
    title: 'Welcome to LG Enterprises',
    message: 'Order groceries from your community store with delivery to your block and flat.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    icon: 'storefront-outline',
    accent: '#0A5C3E',
    soft: '#ECFDF3',
  };

  if (!userId) {
    return [system, ...OFFERS].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const orders = await fetchOrdersForUser(userId);
  const orderNotes = orders.map(orderNotification);
  return [system, ...orderNotes, ...OFFERS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function groupNotificationsByDay(notifications: AppNotification[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const groups: { title: string; items: AppNotification[] }[] = [];
  const buckets = new Map<string, AppNotification[]>();

  for (const item of notifications) {
    const key = new Date(item.createdAt).toDateString();
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  for (const [key, items] of buckets.entries()) {
    let title = 'Earlier';
    if (key === today) title = 'Today';
    else if (key === yesterday) title = 'Yesterday';
    else {
      title = new Date(key).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
      });
    }
    groups.push({ title, items });
  }

  return groups;
}
