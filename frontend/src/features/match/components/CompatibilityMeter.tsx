import { FC } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  score: number;
  /** Optional extra class for the wrapper */
  className?: string;
  /** Compact mode renders smaller text/ring for use inside cards */
  compact?: boolean;
}

function scoreColor(score: number) {
  if (score >= 75) return { ring: '#22c55e', label: 'text-green-400', bg: 'bg-green-500/10' };
  if (score >= 50) return { ring: '#f59e0b', label: 'text-amber-400', bg: 'bg-amber-500/10' };
  return { ring: '#ef4444', label: 'text-red-400', bg: 'bg-red-500/10' };
}

/**
 * CompatibilityMeter
 *
 * Animated arc gauge showing the AI compatibility score.
 * Uses an SVG arc that grows from 0 to `score`% on mount.
 *
 * Colour bands:
 *  ≥ 75 → green (strong match)
 *  ≥ 50 → amber (possible match)
 *  < 50 → red   (weak match)
 */
export const CompatibilityMeter: FC<Props> = ({ score, className, compact = false }) => {
  const colors = scoreColor(score);

  // SVG arc geometry
  const r = compact ? 28 : 38;
  const cx = compact ? 36 : 50;
  const cy = compact ? 36 : 50;
  const size = compact ? 72 : 100;
  const stroke = compact ? 5 : 6;
  const circumference = 2 * Math.PI * r;
  const gap = circumference * 0.25; // bottom-quarter gap for the open arc
  const arcLen = circumference - gap;
  const dashOffset = arcLen - (arcLen * Math.min(100, Math.max(0, score))) / 100;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className={cn('relative rounded-full flex items-center justify-center', colors.bg, compact ? 'p-1' : 'p-2')}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(135deg)' }}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={`${arcLen} ${gap}`}
            strokeLinecap="round"
            className="text-muted/20"
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={colors.ring}
            strokeWidth={stroke}
            strokeDasharray={`${arcLen} ${gap}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: arcLen }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        </svg>
        {/* Score label centred in the ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'rotate(0deg)' }}>
          <span className={cn('font-bold tabular-nums', colors.label, compact ? 'text-sm' : 'text-lg leading-none')}>
            {score}%
          </span>
          {!compact && <span className="text-[10px] text-muted-foreground mt-0.5">Match</span>}
        </div>
      </div>
      {!compact && (
        <span className={cn('text-xs font-semibold', colors.label)}>
          {score >= 75 ? 'Strong Match' : score >= 50 ? 'Good Fit' : 'Low Match'}
        </span>
      )}
    </div>
  );
};
