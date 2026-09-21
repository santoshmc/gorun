import { motion } from 'framer-motion';
import { useId } from 'react';
import { FieldError } from '@/components/ui/FieldError';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSound } from '@/hooks/useSound';
import { QUICK_PICK_DISTANCES, unitLabel } from '@/lib/distance';
import type { DistanceUnit } from '@/types/goal';

export interface DistanceInputProps {
  value: string;
  unit: DistanceUnit;
  error?: string;
  shake: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function DistanceInput({ value, unit, error, shake, onChange, onBlur }: DistanceInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const reduced = useReducedMotion();
  const { play } = useSound();

  return (
    <div>
      <label htmlFor={id} className="block font-display text-sm font-bold text-slate-700">
        Target distance
      </label>

      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_PICK_DISTANCES[unit].map((quickPick) => (
          <button
            key={quickPick}
            type="button"
            onClick={() => {
              play('pop');
              onChange(String(quickPick));
            }}
            className="rounded-full bg-pastel-lemon px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-pastel-lemon-dark"
          >
            {quickPick} {unitLabel(unit)}
          </button>
        ))}
      </div>

      <motion.div
        animate={shake && !reduced ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
        className="relative mt-3"
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder="100"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={() => play('tick')}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 pr-16 text-base text-slate-700 transition focus:border-pastel-sky-dark"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-display text-sm font-bold text-slate-400">
          {unitLabel(unit)}
        </span>
      </motion.div>

      <FieldError id={errorId} message={error} />
    </div>
  );
}
