import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface GoalEmptyStateProps {
  onCreate: () => void;
}

export function GoalEmptyState({ onCreate }: GoalEmptyStateProps) {
  const reduced = useReducedMotion();

  return (
    <section className="rounded-3xl bg-white/80 p-6 text-center shadow-soft ring-1 ring-white/60 backdrop-blur-sm md:p-8">
      <motion.div
        aria-hidden="true"
        animate={reduced ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-pastel-mint text-5xl"
      >
        🏃
      </motion.div>

      <h2 className="mt-6 font-display text-2xl font-bold text-slate-800">
        No goal yet
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-base text-slate-600">
        Pick a target for the month and we will help you chase it, one run at a time.
      </p>

      <Button className="mt-6" onClick={onCreate}>
        Set your monthly goal
      </Button>
    </section>
  );
}
