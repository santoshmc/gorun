import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface FieldErrorProps {
  id: string;
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          initial={reduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="mt-2 text-sm font-semibold text-rose-600"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
