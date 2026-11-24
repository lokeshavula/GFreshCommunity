import { getSupabaseConfigError } from '../config/env';
import { supabase } from '../lib/supabase';
import {
  DeliveryScheduleStatus,
  DeliverySlotPreference,
  DeliveryType,
  GfmDeliverySchedule,
  GfmDeliveryScheduleRow,
  UpsertDeliveryScheduleInput,
  Weekday,
} from '../types/gfm';
import { getErrorMessage } from '../utils/errorMessage';

const SELECT =
  'id, user_id, household_id, delivery_type, preferred_weekday, preferred_month_day, preferred_slot, notes, status, created_at, updated_at';

function mapRow(row: GfmDeliveryScheduleRow): GfmDeliverySchedule {
  return {
    id: row.id,
    userId: row.user_id,
    householdId: row.household_id ?? null,
    deliveryType: row.delivery_type,
    preferredWeekday: row.preferred_weekday ?? null,
    preferredMonthDay: row.preferred_month_day ?? null,
    preferredSlot: row.preferred_slot,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatDeliveryTypeLabel(type: DeliveryType): string {
  if (type === 'WEEKLY') return 'Weekly grocery';
  if (type === 'MONTHLY') return 'Monthly grocery';
  return 'On-demand';
}

export function formatWeekdayLabel(day: Weekday): string {
  const labels: Record<Weekday, string> = {
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday',
  };
  return labels[day];
}

export function formatSlotLabel(slot: DeliverySlotPreference): string {
  return slot === 'MORNING' ? 'Morning (8–11 AM)' : 'Evening (5–8 PM)';
}

export function formatScheduleSummary(schedule: GfmDeliverySchedule | null): string {
  if (!schedule) return 'On demand · Weekly · Monthly';
  if (schedule.deliveryType === 'ON_DEMAND') {
    return 'On demand · Order anytime';
  }
  if (schedule.deliveryType === 'WEEKLY' && schedule.preferredWeekday) {
    const paused = schedule.status === 'PAUSED' ? ' · Paused' : '';
    return `Weekly · ${formatWeekdayLabel(schedule.preferredWeekday)}${paused}`;
  }
  if (schedule.deliveryType === 'MONTHLY' && schedule.preferredMonthDay) {
    const paused = schedule.status === 'PAUSED' ? ' · Paused' : '';
    return `Monthly · Day ${schedule.preferredMonthDay}${paused}`;
  }
  return formatDeliveryTypeLabel(schedule.deliveryType);
}

export async function fetchDeliveryScheduleForUser(
  userId: string,
): Promise<GfmDeliverySchedule | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('gfm_delivery_schedules')
    .select(SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[deliveryScheduleService] fetch:', error.message);
    throw new Error(getErrorMessage(error, 'Could not load delivery schedule.'));
  }

  if (!data) return null;
  return mapRow(data as GfmDeliveryScheduleRow);
}

export async function upsertDeliverySchedule(
  input: UpsertDeliveryScheduleInput,
): Promise<GfmDeliverySchedule> {
  if (!supabase) {
    throw new Error(getSupabaseConfigError() ?? 'Supabase is not configured.');
  }

  if (input.deliveryType === 'WEEKLY' && !input.preferredWeekday) {
    throw new Error('Pick a preferred weekday for weekly grocery delivery.');
  }

  if (input.deliveryType === 'MONTHLY') {
    const day = input.preferredMonthDay;
    if (!day || day < 1 || day > 28) {
      throw new Error('Pick a delivery day between 1 and 28 for monthly grocery.');
    }
  }

  const now = new Date().toISOString();
  const payload = {
    user_id: input.userId,
    household_id: input.householdId ?? null,
    delivery_type: input.deliveryType,
    preferred_weekday: input.deliveryType === 'WEEKLY' ? input.preferredWeekday : null,
    preferred_month_day: input.deliveryType === 'MONTHLY' ? input.preferredMonthDay : null,
    preferred_slot: input.preferredSlot,
    notes: input.notes?.trim() || null,
    status: input.status,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('gfm_delivery_schedules')
    .upsert(payload, { onConflict: 'user_id' })
    .select(SELECT)
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Could not save delivery schedule.'));
  }

  return mapRow(data as GfmDeliveryScheduleRow);
}

export async function setDeliveryScheduleStatus(
  userId: string,
  status: DeliveryScheduleStatus,
): Promise<GfmDeliverySchedule> {
  const current = await fetchDeliveryScheduleForUser(userId);
  if (!current) {
    throw new Error('No delivery schedule found. Save a schedule first.');
  }

  return upsertDeliverySchedule({
    userId,
    householdId: current.householdId,
    deliveryType: current.deliveryType,
    preferredWeekday: current.preferredWeekday,
    preferredMonthDay: current.preferredMonthDay,
    preferredSlot: current.preferredSlot,
    notes: current.notes,
    status,
  });
}
