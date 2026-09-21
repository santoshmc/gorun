import { describe, expect, it } from 'vitest';
import {
  addMonths,
  currentMonthKey,
  formatMonthLabel,
  isPastMonth,
  isValidMonthKey,
  selectableMonths,
} from '@/lib/month';

describe('month helpers', () => {
  it('derives the current month key from local time', () => {
    expect(currentMonthKey(new Date(2026, 8, 21))).toBe('2026-09');
  });

  it('validates month key shape', () => {
    expect(isValidMonthKey('2026-09')).toBe(true);
    expect(isValidMonthKey('2026-13')).toBe(false);
    expect(isValidMonthKey('2026-9')).toBe(false);
    expect(isValidMonthKey('nope')).toBe(false);
  });

  it('rolls over the year when adding months', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-02', -3)).toBe('2025-11');
  });

  it('detects past months without timezone drift', () => {
    const now = new Date(2026, 8, 21);
    expect(isPastMonth('2026-08', now)).toBe(true);
    expect(isPastMonth('2026-09', now)).toBe(false);
    expect(isPastMonth('2026-10', now)).toBe(false);
  });

  it('offers the current month first, then future months', () => {
    const months = selectableMonths(2, new Date(2026, 8, 21));
    expect(months).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('formats a readable label', () => {
    expect(formatMonthLabel('2026-09', 'en-GB')).toBe('September 2026');
  });
});
