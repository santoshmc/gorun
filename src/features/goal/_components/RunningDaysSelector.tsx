export interface RunningDaysSelectorProps {
  value: 3 | 4 | 5;
  onChange: (value: 3 | 4 | 5) => void;
}

const OPTIONS: Array<{ value: 3 | 4 | 5; label: string }> = [
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
];

export function RunningDaysSelector({ value, onChange }: RunningDaysSelectorProps) {
  return (
    <div>
      <p className="font-display text-sm font-bold uppercase tracking-wide text-slate-700">
        Running days per week
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              value === option.value
                ? 'bg-pastel-sky text-slate-800 shadow-soft'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
