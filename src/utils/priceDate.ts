/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export function toPriceDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parsePriceDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function shiftPriceDateKey(key: string, days: number): string {
  const date = parsePriceDateKey(key);
  date.setDate(date.getDate() + days);
  return toPriceDateKey(date);
}

export function formatPriceDateLabel(key: string): string {
  const date = parsePriceDateKey(key);
  const today = toPriceDateKey();
  const yesterday = shiftPriceDateKey(today, -1);
  const tomorrow = shiftPriceDateKey(today, 1);
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  if (key === tomorrow) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPriceDateLong(key: string): string {
  return parsePriceDateKey(key).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
