import { useCallback, useState } from 'react';
import { useSound } from '@/hooks/useSound';
import { firstInvalidField, validateGoalInput } from '@/lib/validation';
import { currentMonthKey } from '@/lib/month';
import { useGoalStore } from '@/store/goalStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Goal, GoalFormValues, GoalValidationErrors } from '@/types/goal';

export type SubmitResult =
  | { status: 'invalid'; firstField?: 'monthKey' | 'targetDistance' }
  | { status: 'needs-confirm' }
  | { status: 'saved'; goal: Goal };

export function useGoalForm(initialGoal?: Goal) {
  const goals = useGoalStore((state) => state.goals);
  const saveGoal = useGoalStore((state) => state.saveGoal);
  const preferredUnit = useSettingsStore((state) => state.preferredUnit);
  const setPreferredUnit = useSettingsStore((state) => state.setPreferredUnit);
  const { play } = useSound();

  const [values, setValues] = useState<GoalFormValues>(() => ({
    monthKey: initialGoal?.monthKey ?? currentMonthKey(),
    targetDistance: initialGoal ? String(initialGoal.targetDistance) : '',
    unit: initialGoal?.unit ?? preferredUnit,
  }));
  const [errors, setErrors] = useState<GoalValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  const updateForm = useCallback((patch: Partial<GoalFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors({});
    setIsDirty(true);
  }, []);

  // Save stays disabled until the form is valid, so blur is what explains why.
  const validateField = useCallback(
    (field: 'monthKey' | 'targetDistance') => {
      const result = validateGoalInput(values);
      setErrors(result.ok ? {} : { [field]: result.errors[field] });
    },
    [values]
  );

  const isValid = validateGoalInput(values).ok;

  const submit = useCallback(
    (options: { confirmedReplace?: boolean } = {}): SubmitResult => {
      const result = validateGoalInput(values);

      if (!result.ok) {
        setErrors(result.errors);
        play('error');
        return { status: 'invalid', firstField: firstInvalidField(result.errors) };
      }

      const replacingDifferentGoal =
        goals[result.value.monthKey] !== undefined &&
        goals[result.value.monthKey].id !== initialGoal?.id;

      if (replacingDifferentGoal && !options.confirmedReplace) {
        return { status: 'needs-confirm' };
      }

      const goal = saveGoal(result.value);
      setPreferredUnit(result.value.unit);
      setIsDirty(false);
      play('success');
      return { status: 'saved', goal };
    },
    [values, goals, initialGoal?.id, saveGoal, setPreferredUnit, play]
  );

  return { values, errors, isDirty, isValid, updateForm, validateField, submit };
}
