import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSound } from '@/hooks/useSound';
import type { DistanceUnit } from '@/types/goal';

const OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'km' },
  { value: 'mi', label: 'miles' },
];

export interface UnitToggleProps {
  value: DistanceUnit;
  onChange: (unit: DistanceUnit) => void;
}

export function UnitToggle({ value, onChange }: UnitToggleProps) {
  const reduced = useReducedMotion();
  const { play } = useSound();

  return (
    <div role="radiogroup" aria-label="Distance unit" className="inline-flex rounded-full bg-slate-100 p-1">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              play('pop');
              onChange(option.value);
            }}
            className="relative rounded-full px-5 py-2 font-display text-sm font-semibold"
          >
            {selected && !reduced && (
              <motion.span
                layoutId="unit-toggle-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-full bg-white shadow-soft"
              />
            )}
            {selected && reduced && <span className="absolute inset-0 rounded-full bg-white shadow-soft" />}
            <span className={`relative ${selected ? 'text-slate-800' : 'text-slate-500'}`}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
