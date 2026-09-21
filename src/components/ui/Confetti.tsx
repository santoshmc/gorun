import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const COLORS = ['#FFB3A0', '#BFE3FF', '#C7F0DB', '#E0D7FF', '#FFF1B8', '#FFC2D4'];
const PIECE_COUNT = 24;
const DURATION_MS = 1400;

export interface ConfettiProps {
  /** Increment to fire a burst. */
  burstId: number;
}

export function Confetti({ burstId }: ConfettiProps) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (burstId === 0 || reduced) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [burstId, reduced]);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, index) => ({
        id: index,
        x: (Math.random() - 0.5) * 420,
        y: -160 - Math.random() * 220,
        rotate: (Math.random() - 0.5) * 540,
        color: COLORS[index % COLORS.length],
        delay: Math.random() * 0.12,
      })),
    [burstId]
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-1/3 z-[60] flex justify-center">
      <AnimatePresence>
        {visible &&
          pieces.map((piece) => (
            <motion.span
              key={`${burstId}-${piece.id}`}
              initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
              animate={{ opacity: 0, x: piece.x, y: piece.y, rotate: piece.rotate }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION_MS / 1000, delay: piece.delay, ease: 'easeOut' }}
              style={{ backgroundColor: piece.color }}
              className="absolute h-3 w-2 rounded-sm"
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
