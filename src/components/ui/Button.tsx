import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSound } from '@/hooks/useSound';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-pastel-coral-dark text-white hover:bg-pastel-coral shadow-soft',
  secondary: 'bg-white text-slate-600 ring-2 ring-slate-200 hover:bg-slate-50',
  danger: 'bg-pastel-rose-dark text-white hover:bg-pastel-rose shadow-soft',
  ghost: 'bg-transparent text-slate-500 hover:bg-white/70',
};

export interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
  > {
  variant?: Variant;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', fullWidth, className = '', onClick, type = 'button', ...props },
  ref
) {
  const { play } = useSound();
  const reduced = useReducedMotion();

  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={reduced || props.disabled ? undefined : { scale: 1.04 }}
      whileTap={reduced || props.disabled ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      onClick={(event) => {
        if (!props.disabled) play('pop');
        onClick?.(event);
      }}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display font-semibold',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    />
  );
});
