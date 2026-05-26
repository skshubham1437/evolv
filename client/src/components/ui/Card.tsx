import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
}

export function Card({ hoverable = false, padded = true, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl
        ${padded ? 'p-5' : ''}
        ${hoverable ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
