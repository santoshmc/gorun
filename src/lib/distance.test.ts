import { describe, expect, it } from 'vitest';
import { formatDistance, maxTargetDistance, toKilometres, unitLabel } from '@/lib/distance';

describe('distance helpers', () => {
  it('formats whole numbers without a decimal', () => {
    expect(formatDistance(100, 'km')).toBe('100 km');
  });

  it('formats fractional values to one decimal place', () => {
    expect(formatDistance(42.25, 'km')).toBe('42.3 km');
    expect(formatDistance(42.04, 'mi')).toBe('42 mi');
  });

  it('exposes the unit label', () => {
    expect(unitLabel('km')).toBe('km');
    expect(unitLabel('mi')).toBe('mi');
  });

  it('converts miles to kilometres', () => {
    expect(toKilometres(1, 'mi')).toBeCloseTo(1.609344, 5);
    expect(toKilometres(10, 'km')).toBe(10);
  });

  it('scales the sanity ceiling to the unit', () => {
    expect(maxTargetDistance('km')).toBe(2000);
    expect(maxTargetDistance('mi')).toBe(1242);
  });
});
