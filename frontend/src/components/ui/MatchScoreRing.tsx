
'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MatchScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  className?: string;
}

export function MatchScoreRing({
  score,
  size = 60,
  strokeWidth = 4,
  animated = true,
  className,
}: MatchScoreRingProps) {
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth);
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = useMemo(() => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }, [score]);

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="stroke-current text-border/50"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={size / 2 - strokeWidth}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={cn('stroke-current transform -rotate-90 origin-center', color)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={size / 2 - strokeWidth}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset }}
          transition={animated ? { duration: 1.5, delay: 0.2, ease: 'easeOut' } : { duration: 0 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{Math.round(score)}%</span>
      </div>
    </div>
  );
}
