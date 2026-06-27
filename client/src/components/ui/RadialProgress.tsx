import { useEffect, useRef } from 'react';

interface RadialProgressProps {
  value: number;           // 0-100
  size?: number;           // px, default 80
  strokeWidth?: number;    // default 6
  color?: string;          // CSS color, default var(--color-primary)
  trackColor?: string;
  label?: string;          // big center text (overrides value)
  sublabel?: string;       // small text below
  animate?: boolean;       // default true
  className?: string;
}

/**
 * SVG-based radial/circular progress ring.
 * Animates from 0 → value on mount.
 */
export function RadialProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = 'var(--color-primary)',
  trackColor = 'var(--color-surface-container-high)',
  label,
  sublabel,
  animate = true,
  className = '',
}: RadialProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedValue / 100) * circumference;

  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!animate || !circleRef.current) return;
    // Start from full offset (0%) then animate to target
    const el = circleRef.current;
    el.style.strokeDashoffset = String(circumference);
    el.style.transition = 'none';
    // Force reflow then animate
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.strokeDashoffset = String(dashOffset);
  }, [value, circumference, dashOffset, animate]);

  const displayLabel = label ?? `${clampedValue}%`;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={sublabel ? `${sublabel}: ${clampedValue}%` : `${clampedValue}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="square"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference : dashOffset}
          style={{
            transition: animate ? undefined : 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-mono font-bold leading-none"
          style={{
            fontSize: size < 60 ? '11px' : size < 80 ? '14px' : '16px',
            color,
          }}
        >
          {displayLabel}
        </span>
        {sublabel && (
          <span
            className="font-mono uppercase tracking-wider text-[var(--color-outline)] leading-none mt-1"
            style={{ fontSize: size < 70 ? '7px' : '9px' }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
