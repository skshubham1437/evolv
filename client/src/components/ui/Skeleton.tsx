interface SkeletonProps {
  className?: string;
  count?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', count = 1, style }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse bg-[var(--color-surface-container-highest)]/60 rounded-sm ${className}`} style={style} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-5 space-y-4 shadow-md">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="space-y-2 pt-2 border-t border-[var(--color-outline-variant)]/50">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3.5 px-4 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]/50">
      <Skeleton className="w-5 h-5 shrink-0" />
      <Skeleton className="w-8 h-4 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="w-16 h-3 shrink-0" />
    </div>
  );
}

export function SkeletonHeatmap() {
  return (
    <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col justify-between h-[184px]">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="h-20 flex items-end gap-[2px]">
        {Array.from({ length: 30 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${20 + (i % 5) * 15}%` }} />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
