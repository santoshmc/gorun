import { maxTargetDistance, unitLabel } from '@/lib/distance';
import { isPastMonth, isValidMonthKey } from '@/lib/month';
import type {
  GoalFormValues,
  GoalValidationErrors,
  GoalValidationResult,
} from '@/types/goal';

const AT_MOST_ONE_DECIMAL = /^\d+(\.\d)?$/;

export function validateGoalInput(
  values: GoalFormValues,
  now: Date = new Date()
): GoalValidationResult {
  const errors: GoalValidationErrors = {};

  if (!isValidMonthKey(values.monthKey)) {
    errors.monthKey = 'Pick a month for your goal.';
  } else if (isPastMonth(values.monthKey, now)) {
    errors.monthKey = 'That month has already finished. Pick this month or a future one.';
  }

  const raw = values.targetDistance.trim();
  const max = maxTargetDistance(values.unit);

  if (raw === '') {
    errors.targetDistance = 'Enter how far you want to run.';
  } else if (!AT_MOST_ONE_DECIMAL.test(raw)) {
    errors.targetDistance = 'Use a positive number with at most one decimal place.';
  } else {
    const parsed = Number(raw);
    if (parsed <= 0) {
      errors.targetDistance = 'Your target needs to be more than zero.';
    } else if (parsed > max) {
      errors.targetDistance = `That looks like a typo — keep it under ${max} ${unitLabel(values.unit)}.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      monthKey: values.monthKey,
      targetDistance: Number(raw),
      unit: values.unit,
    },
  };
}

export const GOAL_FIELD_ORDER = ['monthKey', 'targetDistance'] as const;

export function firstInvalidField(errors: GoalValidationErrors) {
  return GOAL_FIELD_ORDER.find((field) => errors[field] !== undefined);
}
