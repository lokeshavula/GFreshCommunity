import { OrderStatus } from '../types/gfm';

export type TrackStepId =
  | 'at_mart'
  | 'packing'
  | 'delivery_ready'
  | 'arriving'
  | 'delivered';

export type TrackStep = {
  id: TrackStepId;
  title: string;
  subtitle: string;
  icon: string;
};

export const ORDER_TRACK_STEPS: TrackStep[] = [
  {
    id: 'at_mart',
    title: 'At community mart',
    subtitle: 'Order received at G-Fresh Mart',
    icon: 'storefront-outline',
  },
  {
    id: 'packing',
    title: 'Packing',
    subtitle: 'Your items are being packed carefully',
    icon: 'cube-outline',
  },
  {
    id: 'delivery_ready',
    title: 'Delivery ready',
    subtitle: 'Packed and ready to leave the mart',
    icon: 'checkbox-outline',
  },
  {
    id: 'arriving',
    title: 'Arriving to your flat',
    subtitle: 'On the way from mart to your door',
    icon: 'bicycle-outline',
  },
  {
    id: 'delivered',
    title: 'Delivered',
    subtitle: 'Handed over at your flat',
    icon: 'home-outline',
  },
];

const STATUS_TO_STEP: Record<string, number> = {
  placed: 0,
  confirmed: 0,
  at_mart: 0,
  packing: 1,
  ready: 2,
  delivery_ready: 2,
  shipped: 3,
  out_for_delivery: 3,
  arriving: 3,
  delivered: 4,
  cancelled: -1,
};

export function getTrackStepIndex(status: string): number {
  return STATUS_TO_STEP[status] ?? 0;
}

export function getTrackStepLabel(status: string): string {
  if (status === 'cancelled') {
    return 'Cancelled';
  }
  const index = getTrackStepIndex(status);
  return ORDER_TRACK_STEPS[index]?.title ?? 'Processing';
}

export function normalizeOrderStatus(status: string): OrderStatus | string {
  return status;
}

/** Live progression for placed orders: mart → packing → ready → arriving → flat. */
export function getLiveTrackStepIndex(status: string, orderedAt?: string): number {
  if (status === 'cancelled') {
    return -1;
  }

  const mapped = getTrackStepIndex(status);
  if (status !== 'placed' && status !== 'confirmed') {
    return mapped;
  }

  if (!orderedAt) {
    return 0;
  }

  const seconds = Math.max(0, (Date.now() - new Date(orderedAt).getTime()) / 1000);
  if (seconds >= 120) return 4;
  if (seconds >= 90) return 3;
  if (seconds >= 60) return 2;
  if (seconds >= 25) return 1;
  return 0;
}
