import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Goal } from '@/types/goal';
import type { TrainingPlan } from '@/types/trainingPlan';

export interface TrainingPlanSectionProps {
  goal: Goal;
  plan?: TrainingPlan;
  onGenerate: () => void;
  onEdit: () => void;
}

export function TrainingPlanSection({ goal, plan, onGenerate, onEdit }: TrainingPlanSectionProps) {
  const summary = plan?.weeks[0];

  return (
    <motion.section
      layout
      className="rounded-3xl bg-white/80 p-6 shadow-soft ring-1 ring-white/60 backdrop-blur-sm md:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wide text-slate-500">
            Training plan
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold text-slate-800">
            {plan ? 'This month’s plan' : 'Generate a weekly plan'}
          </h3>
        </div>

        <Button variant="secondary" onClick={plan ? onEdit : onGenerate}>
          {plan ? 'Edit plan' : 'Generate plan'}
        </Button>
      </div>

      {plan ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-pastel-sky/30 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600">Weekly target</p>
            <p className="mt-2 font-display text-xl font-bold text-slate-800">
              {Math.round((goal.targetDistance / plan.weeks.length) * 10) / 10} {goal.unit}
            </p>
          </div>
          <div className="rounded-2xl bg-pastel-mint/30 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600">Running days</p>
            <p className="mt-2 font-display text-xl font-bold text-slate-800">
              {plan.runningDaysPerWeek} / week
            </p>
          </div>
          <div className="rounded-2xl bg-pastel-coral/30 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600">Style</p>
            <p className="mt-2 font-display text-xl font-bold text-slate-800">
              {plan.distributionStyle === 'even' ? 'Even' : 'Progressive'}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-base text-slate-600">
          Turn your monthly goal into a clear weekly running schedule with explicit rest days.
        </p>
      )}

      {summary && (
        <div className="mt-5 flex flex-wrap gap-2">
          {summary.days.map((day) => (
            <span
              key={`${plan?.monthKey}-${summary.weekIndex}-${day.dayNumber}`}
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold',
                day.type === 'run' ? 'bg-pastel-lemon text-slate-700' : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {day.label}: {day.type === 'run' ? `${day.distance ?? 0} ${goal.unit}` : 'Rest'}
            </span>
          ))}
        </div>
      )}
    </motion.section>
  );
}
