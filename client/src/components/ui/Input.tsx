import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, leftIcon, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl
            px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
            focus:outline-none focus:border-[var(--accent-solid)] focus:ring-1 focus:ring-[var(--accent-glow)]
            transition-all duration-150
            ${leftIcon ? 'pl-10' : ''}
            ${error ? 'border-rose-500 focus:border-rose-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
