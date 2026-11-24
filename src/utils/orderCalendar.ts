import { calculateOrderTotal } from '../services/orderService';
import { GfmOrder } from '../types/gfm';

export type DayActivity = {
  date: string;
  orderCount: number;
  revenue: number;
};

export type MonthActivity = {
  activeDays: number;
  firstActiveDate: Date | null;
  activeDates: Set<string>;
  totalOrders: number;
  totalRevenue: number;
};

export type BestPeriod = {
  dayCount: number;
  startDate: Date;
  endDate: Date;
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function toDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildOrderActivityMap(orders: GfmOrder[]): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();

  for (const order of orders) {
    const key = toDateKey(order.orderedAt);
    if (!key) {
      continue;
    }
    const existing = map.get(key);
    const revenue = calculateOrderTotal(order.items);
    if (existing) {
      existing.orderCount += 1;
      existing.revenue += revenue;
    } else {
      map.set(key, { date: key, orderCount: 1, revenue });
    }
  }

  return map;
}

export function getMonthActivity(
  activityMap: Map<string, DayActivity>,
  year: number,
  month: number,
): MonthActivity {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const activeDates = new Set<string>();
  let totalOrders = 0;
  let totalRevenue = 0;
  let firstActiveDate: Date | null = null;

  for (const [key, day] of activityMap.entries()) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    activeDates.add(key);
    totalOrders += day.orderCount;
    totalRevenue += day.revenue;
    const date = new Date(`${key}T12:00:00`);
    if (!firstActiveDate || date < firstActiveDate) {
      firstActiveDate = date;
    }
  }

  return {
    activeDays: activeDates.size,
    firstActiveDate,
    activeDates,
    totalOrders,
    totalRevenue,
  };
}

export function getBestPeriod(activityMap: Map<string, DayActivity>): BestPeriod | null {
  const sortedKeys = [...activityMap.keys()].sort();
  if (sortedKeys.length === 0) {
    return null;
  }

  let bestStart = sortedKeys[0];
  let bestEnd = sortedKeys[0];
  let bestCount = 1;

  let streakStart = sortedKeys[0];
  let streakEnd = sortedKeys[0];
  let streakCount = 1;

  for (let index = 1; index < sortedKeys.length; index += 1) {
    const prev = new Date(`${sortedKeys[index - 1]}T12:00:00`);
    const current = new Date(`${sortedKeys[index]}T12:00:00`);
    const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      streakEnd = sortedKeys[index];
      streakCount += 1;
    } else {
      if (streakCount > bestCount) {
        bestStart = streakStart;
        bestEnd = streakEnd;
        bestCount = streakCount;
      }
      streakStart = sortedKeys[index];
      streakEnd = sortedKeys[index];
      streakCount = 1;
    }
  }

  if (streakCount > bestCount) {
    bestStart = streakStart;
    bestEnd = streakEnd;
    bestCount = streakCount;
  }

  return {
    dayCount: bestCount,
    startDate: new Date(`${bestStart}T12:00:00`),
    endDate: new Date(`${bestEnd}T12:00:00`),
  };
}

export function getAllTimeActiveDays(activityMap: Map<string, DayActivity>): number {
  return activityMap.size;
}

export function getOverallPeriod(activityMap: Map<string, DayActivity>): BestPeriod | null {
  const sortedKeys = [...activityMap.keys()].sort();
  if (sortedKeys.length === 0) {
    return null;
  }

  return {
    dayCount: sortedKeys.length,
    startDate: new Date(`${sortedKeys[0]}T12:00:00`),
    endDate: new Date(`${sortedKeys[sortedKeys.length - 1]}T12:00:00`),
  };
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortPeriod(start: Date, end: Date): string {
  const startText = start.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const endText = end.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${startText} - ${endText}`;
}

export function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells: Array<{ day: number | null; key: string }> = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({ day: null, key: `empty-${index}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ day, key });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: `pad-${cells.length}` });
  }

  return { cells, weekdays: WEEKDAYS };
}

export function getLongestStreakInMonth(
  activityMap: Map<string, DayActivity>,
  year: number,
  month: number,
): BestPeriod | null {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const monthKeys = [...activityMap.keys()].filter(key => key.startsWith(prefix)).sort();

  if (monthKeys.length === 0) {
    return null;
  }

  let bestStart = monthKeys[0];
  let bestEnd = monthKeys[0];
  let bestCount = 1;

  let streakStart = monthKeys[0];
  let streakEnd = monthKeys[0];
  let streakCount = 1;

  for (let index = 1; index < monthKeys.length; index += 1) {
    const prev = new Date(`${monthKeys[index - 1]}T12:00:00`);
    const current = new Date(`${monthKeys[index]}T12:00:00`);
    const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      streakEnd = monthKeys[index];
      streakCount += 1;
    } else {
      if (streakCount > bestCount) {
        bestStart = streakStart;
        bestEnd = streakEnd;
        bestCount = streakCount;
      }
      streakStart = monthKeys[index];
      streakEnd = monthKeys[index];
      streakCount = 1;
    }
  }

  if (streakCount > bestCount) {
    bestStart = streakStart;
    bestEnd = streakEnd;
    bestCount = streakCount;
  }

  return {
    dayCount: bestCount,
    startDate: new Date(`${bestStart}T12:00:00`),
    endDate: new Date(`${bestEnd}T12:00:00`),
  };
}

export function isDateInRange(dateKey: string, start: Date, end: Date): boolean {
  const date = new Date(`${dateKey}T12:00:00`);
  return date >= start && date <= end;
}
