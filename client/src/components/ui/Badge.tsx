import { type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info' | 'default';
}

const variants = {
  high:    'text-rose-400    bg-rose-400/10    border-rose-400/20',
  medium:  'text-amber-400   bg-amber-400/10   border-amber-400/20',
  low:     'text-slate-400   bg-slate-400/10   border-slate-400/20',
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  warning: 'text-amber-400   bg-amber-400/10   border-amber-400/20',
  info:    'text-sky-400     bg-sky-400/10     border-sky-400/20',
  default: 'text-[var(--text-secondary)] bg-white/5 border-[var(--border-subtle)]',
};

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-2 py-0.5 rounded-md border
        text-xs font-medium uppercase tracking-wider
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}
