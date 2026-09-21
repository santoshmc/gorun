import { motion } from 'framer-motion';
import { formatDistance, unitName } from '@/lib/distance';
import { formatMonthLabel, isPastMonth } from '@/lib/month';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Goal } from '@/types/goal';

export interface GoalSummaryCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalSummaryCard({ goal, onEdit, onDelete }: GoalSummaryCardProps) {
  const reduced = useReducedMotion();
  // Past months are historical records, so their controls are removed entirely.
  const editable = !isPastMonth(goal.monthKey);

  return (
    <motion.section
      layout
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      aria-label={`Goal for ${formatMonthLabel(goal.monthKey)}`}
      className="relative rounded-3xl bg-white/80 p-6 shadow-soft ring-1 ring-white/60 backdrop-blur-sm transition-shadow hover:shadow-lifted md:p-8"
    >
      {editable && (
        <div className="absolute right-4 top-4 flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit goal"
            className="rounded-full px-3 py-2 text-lg transition hover:bg-pastel-sky/50"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete goal"
            className="rounded-full px-3 py-2 text-lg transition hover:bg-pastel-rose/60"
          >
            🗑️
          </button>
        </div>
      )}

      <p className="font-display text-sm font-bold uppercase tracking-wide text-slate-400">
        {formatMonthLabel(goal.monthKey)}
      </p>

      <p className="mt-2 font-display text-5xl font-extrabold tracking-tight text-slate-800 md:text-6xl lg:text-7xl">
        {formatDistance(goal.targetDistance, goal.unit)}
      </p>

      <p className="mt-3 text-base text-slate-600">
        Your target for the month, in {unitName(goal.unit)}.
      </p>

      {!editable && (
        <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
          This month has finished, so the goal is kept as a record.
        </p>
      )}
    </motion.section>
  );
}
