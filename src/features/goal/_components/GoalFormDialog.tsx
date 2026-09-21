import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { DistanceInput } from '@/features/goal/_components/DistanceInput';
import { MonthPicker } from '@/features/goal/_components/MonthPicker';
import { UnitToggle } from '@/features/goal/_components/UnitToggle';
import { useGoalForm } from '@/features/goal/_components/useGoalForm';
import { formatMonthLabel } from '@/lib/month';
import type { Goal } from '@/types/goal';

export interface GoalFormDialogProps {
  open: boolean;
  goal?: Goal;
  onClose: () => void;
  onSaved: (goal: Goal) => void;
}

export function GoalFormDialog({ open, goal, onClose, onSaved }: GoalFormDialogProps) {
  const { values, errors, isDirty, isValid, updateForm, validateField, submit } = useGoalForm(goal);
  const [confirm, setConfirm] = useState<'replace' | 'discard' | null>(null);
  const [shake, setShake] = useState(false);
  const formId = useId();
  const isEdit = goal !== undefined;

  const handleSubmit = (confirmedReplace = false) => {
    const result = submit({ confirmedReplace });

    if (result.status === 'invalid') {
      setShake(true);
      window.setTimeout(() => setShake(false), 320);
      return;
    }

    if (result.status === 'needs-confirm') {
      setConfirm('replace');
      return;
    }

    setConfirm(null);
    onSaved(result.goal);
  };

  const requestClose = () => {
    if (isDirty) {
      setConfirm('discard');
      return;
    }
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        title={isEdit ? 'Edit your goal' : 'Set your monthly goal'}
        description={
          isEdit
            ? 'Adjust your target — no pressure, plans can change.'
            : 'Pick a month and how far you want to run. We will take it from there.'
        }
        onClose={requestClose}
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={!isValid}>
              Save goal
            </Button>
          </>
        }
      >
        <form
          id={formId}
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <MonthPicker
            value={values.monthKey}
            error={errors.monthKey}
            disabled={isEdit}
            onChange={(monthKey) => updateForm({ monthKey })}
            onBlur={() => validateField('monthKey')}
          />

          <div>
            <span className="block font-display text-sm font-bold text-slate-700">Unit</span>
            <div className="mt-2">
              <UnitToggle value={values.unit} onChange={(unit) => updateForm({ unit })} />
            </div>
          </div>

          <DistanceInput
            value={values.targetDistance}
            unit={values.unit}
            error={errors.targetDistance}
            shake={shake}
            onChange={(targetDistance) => updateForm({ targetDistance })}
            onBlur={() => validateField('targetDistance')}
          />

          <div aria-live="polite" className="sr-only">
            {Object.values(errors).join(' ')}
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirm === 'replace'}
        title="Replace your existing goal?"
        description={`You already have a goal for ${formatMonthLabel(values.monthKey)}. Saving will replace that target.`}
        confirmLabel="Replace it"
        cancelLabel="Keep the old one"
        onConfirm={() => handleSubmit(true)}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm === 'discard'}
        title="Discard your changes?"
        description="Your edits will not be saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setConfirm(null);
          onClose();
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
