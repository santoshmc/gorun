import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSound } from '@/hooks/useSound';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Counts back() calls we made ourselves so their popstate is not read as a user back-navigation. */
let programmaticBacks = 0;

export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}

export function Dialog({ open, title, description, onClose, children, footer }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const pushedHistoryRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const reduced = useReducedMotion();
  const { play } = useSound();

  // Kept in a ref so the effect below only ever re-runs when `open` changes.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement;
    playRef.current('swoosh');

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Let the browser back button dismiss the dialog instead of leaving the app.
    window.history.pushState({ dialog: true }, '');
    pushedHistoryRef.current = true;
    const onPopState = () => {
      if (programmaticBacks > 0) {
        programmaticBacks -= 1;
        return;
      }
      pushedHistoryRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPopState);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      document.body.style.overflow = overflow;
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        programmaticBacks += 1;
        window.history.back();
      }
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            role="presentation"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.97 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="relative w-full rounded-t-3xl bg-white p-6 shadow-lifted sm:w-[28rem] sm:rounded-3xl"
          >
            <h2 id={titleId} className="font-display text-2xl font-bold text-slate-800">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
            <div className="mt-5">{children}</div>
            {footer && <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
