import type { MonthKey } from '@/types/goal';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

export function toMonthKey(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [year, month] = key.split('-');
  return { year: Number(year), month: Number(month) };
}

/** Uses local time so the month matches the runner's own calendar. */
export function currentMonthKey(now: Date = new Date()): MonthKey {
  return toMonthKey(now.getFullYear(), now.getMonth() + 1);
}

export function addMonths(key: MonthKey, amount: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const zeroBased = month - 1 + amount;
  return toMonthKey(year + Math.floor(zeroBased / 12), ((zeroBased % 12) + 12) % 12 + 1);
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function isPastMonth(key: MonthKey, now: Date = new Date()): boolean {
  return compareMonthKeys(key, currentMonthKey(now)) < 0;
}

export function formatMonthLabel(key: MonthKey, locale?: string): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

/** Month options for the picker: the current month plus the next `count` months. */
export function selectableMonths(count = 11, now: Date = new Date()): MonthKey[] {
  const start = currentMonthKey(now);
  return Array.from({ length: count + 1 }, (_, index) => addMonths(start, index));
}
