import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import {
  CreateOrderInput,
  GfmOrder,
  GfmOrderItem,
  GfmOrderRow,
  GfmUser,
  OrderStatus,
} from '../types/gfm';
import { assertShoppingAccess } from '../utils/authGuard';

function mapOrderRow(row: GfmOrderRow): GfmOrder {
  const items = Array.isArray(row.items) ? row.items : [];

  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    customerName: row.customer_name,
    mobileNumber: row.mobile_number,
    blockNumber: row.block_number,
    flatNo: row.flat_no,
    items,
    deliverySlot: row.delivery_slot,
    deliveryTime: row.delivery_time,
    instructions: row.instructions,
    orderedAt: row.ordered_at,
    status: row.status,
    statusUpdatedAt: row.status_updated_at,
  };
}

export { mapOrderRow as mapOrderRowFromRow };

function generateOrderId(): string {
  const stamp = new Date().toISOString().split('.')[0].replace(/[^0-9]/g, '').slice(0, 14);
  return `GFM-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
}

function buildOrderPayload(user: GfmUser, input: CreateOrderInput) {
  return {
    order_id: generateOrderId(),
    user_id: user.id,
    customer_name: user.fullName,
    mobile_number: user.mobileNumber,
    block_number: user.blockNumber,
    flat_no: user.flatNo,
    items: input.items,
    delivery_slot: input.deliverySlot,
    delivery_time: input.deliveryTime,
    instructions: input.instructions?.trim() ?? '',
    status: 'placed' as OrderStatus,
    status_updated_at: new Date().toISOString(),
  };
}

export async function fetchOrdersForUser(userId: string): Promise<GfmOrder[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('gfm_orders')
    .select('*')
    .eq('user_id', userId)
    .order('ordered_at', { ascending: false });

  if (error) {
    console.warn('[orderService] fetchOrdersForUser:', error.message);
    return [];
  }

  return (data as GfmOrderRow[]).map(mapOrderRow);
}

export async function createOrder(
  user: GfmUser,
  input: CreateOrderInput,
): Promise<GfmOrder> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  assertShoppingAccess(user);

  if (!input.items.length) {
    throw new Error('Cart is empty.');
  }

  if (!input.deliverySlot.trim() || !input.deliveryTime.trim()) {
    throw new Error('Please select delivery slot and time.');
  }

  const { data, error } = await supabase
    .from('gfm_orders')
    .insert(buildOrderPayload(user, input))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapOrderRow(data as GfmOrderRow);
}

export async function fetchOrderByOrderId(orderId: string): Promise<GfmOrder | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('gfm_orders')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOrderRow(data as GfmOrderRow);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<GfmOrder | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('gfm_orders')
    .update({
      status,
      status_updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (error) {
    console.warn('[orderService] updateOrderStatus:', error.message);
    return null;
  }

  return mapOrderRow(data as GfmOrderRow);
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from('gfm_orders').delete().eq('id', orderId);

  if (error) {
    console.warn('[orderService] deleteOrder:', error.message);
    return false;
  }

  return true;
}

export function calculateOrderTotal(items: GfmOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
