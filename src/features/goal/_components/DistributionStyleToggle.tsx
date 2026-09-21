import type { DistributionStyle } from '@/types/trainingPlan';

export interface DistributionStyleToggleProps {
  value: DistributionStyle;
  onChange: (value: DistributionStyle) => void;
}

const OPTIONS: Array<{ value: DistributionStyle; label: string }> = [
  { value: 'even', label: 'Even split' },
  { value: 'progressive', label: 'Progressive long run' },
];

export function DistributionStyleToggle({ value, onChange }: DistributionStyleToggleProps) {
  return (
    <div>
      <p className="font-display text-sm font-bold uppercase tracking-wide text-slate-700">
        Distribution style
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
              value === option.value
                ? 'border-pastel-coral bg-pastel-coral/20 text-slate-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
