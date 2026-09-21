import { useId } from 'react';
import { FieldError } from '@/components/ui/FieldError';
import { useSound } from '@/hooks/useSound';
import { formatMonthLabel, selectableMonths } from '@/lib/month';
import type { MonthKey } from '@/types/goal';

export interface MonthPickerProps {
  value: MonthKey;
  error?: string;
  onChange: (monthKey: MonthKey) => void;
  onBlur: () => void;
  disabled?: boolean;
}

export function MonthPicker({ value, error, onChange, onBlur, disabled }: MonthPickerProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const { play } = useSound();
  const months = selectableMonths();
  const options = months.includes(value) ? months : [value, ...months];

  return (
    <div>
      <label htmlFor={id} className="block font-display text-sm font-bold text-slate-700">
        Goal month
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={() => play('tick')}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-700 transition focus:border-pastel-sky-dark disabled:bg-slate-50 disabled:text-slate-400"
      >
        {options.map((monthKey) => (
          <option key={monthKey} value={monthKey}>
            {formatMonthLabel(monthKey)}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
