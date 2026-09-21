import { describe, expect, it } from 'vitest';
import { validateGoalInput } from '@/lib/validation';
import type { GoalFormValues } from '@/types/goal';

const NOW = new Date(2026, 8, 21);

const base: GoalFormValues = {
  monthKey: '2026-09',
  targetDistance: '100',
  unit: 'km',
};

function validate(patch: Partial<GoalFormValues>) {
  return validateGoalInput({ ...base, ...patch }, NOW);
}

describe('validateGoalInput', () => {
  it('accepts a valid goal and parses the distance', () => {
    const result = validate({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ monthKey: '2026-09', targetDistance: 100, unit: 'km' });
    }
  });

  it('accepts one decimal place', () => {
    expect(validate({ targetDistance: '42.5' }).ok).toBe(true);
  });

  it('rejects an empty distance', () => {
    const result = validate({ targetDistance: '  ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.targetDistance).toBeDefined();
  });

  it.each(['0', '-5', 'abc', '10.25'])('rejects invalid distance %s', (targetDistance) => {
    const result = validate({ targetDistance });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.targetDistance).toBeDefined();
  });

  it('rejects a distance above the sanity ceiling', () => {
    const result = validate({ targetDistance: '2001' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.targetDistance).toContain('2000');
  });

  it('applies the miles ceiling when the unit is miles', () => {
    expect(validate({ unit: 'mi', targetDistance: '1300' }).ok).toBe(false);
    expect(validate({ unit: 'mi', targetDistance: '1200' }).ok).toBe(true);
  });

  it('rejects a month in the past', () => {
    const result = validate({ monthKey: '2026-08' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.monthKey).toBeDefined();
  });

  it('accepts a future month', () => {
    expect(validate({ monthKey: '2027-01' }).ok).toBe(true);
  });

  it('rejects a malformed month key', () => {
    expect(validate({ monthKey: '2026-99' }).ok).toBe(false);
  });
});
