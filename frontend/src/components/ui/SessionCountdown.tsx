
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns';
import { cn } from '@/lib/utils';
import { GradientButton } from './GradientButton';

interface SessionCountdownProps {
  scheduledAt: Date | string;
  onJoin?: () => void;
  className?: string;
}

export function SessionCountdown({ scheduledAt, onJoin, className }: SessionCountdownProps) {
  const targetDate = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  const [secondsLeft, setSecondsLeft] = useState(differenceInSeconds(targetDate, new Date()));

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const duration = intervalToDuration({ start: 0, end: secondsLeft * 1000 });
  const formattedDuration = formatDuration(duration, {
    format: ['days', 'hours', 'minutes', 'seconds'],
    delimiter: ', ',
  });
  
  const timeInfo = useMemo(() => {
    if (secondsLeft <= 0) {
      return { text: 'Session starting now!', color: 'text-green-500', isPulsing: true };
    }
    if (secondsLeft < 3600) { // Less than 1 hour
      return { text: `${duration.minutes}m ${duration.seconds}s`, color: 'text-red-500', isPulsing: true };
    }
    if (secondsLeft < 7200) { // Less than 2 hours
      return { text: `${duration.hours}h ${duration.minutes}m`, color: 'text-amber-500', isPulsing: false };
    }
    return { text: formattedDuration, color: 'text-muted-foreground', isPulsing: false };
  }, [secondsLeft, duration, formattedDuration]);


  if (secondsLeft <= -1800) { // Session ended 30 mins ago
    return <div className={cn("text-sm text-muted-foreground", className)}>Session has ended.</div>;
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <p className={cn('text-lg font-mono font-semibold', timeInfo.color, timeInfo.isPulsing && 'animate-pulse')}>
        {timeInfo.text}
      </p>
      {secondsLeft < 900 && ( // Show join button 15 mins before
        <GradientButton onClick={onJoin} size="lg">
          Join Now
        </GradientButton>
      )}
    </div>
  );
}
