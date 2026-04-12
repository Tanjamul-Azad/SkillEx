/**
 * AnimatedGradientBorder
 *
 * Wraps children in a div with a continuously rotating conic gradient border.
 * Achieved with the CSS `@property` / mask technique — no JS animation loop.
 * Degrades gracefully (border disappears if mask not supported).
 *
 * Usage:
 *   <AnimatedGradientBorder className="rounded-2xl" borderWidth={2}>
 *     <YourContent />
 *   </AnimatedGradientBorder>
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedGradientBorderProps {
  children: React.ReactNode;
  className?: string;
  borderWidth?: number;    // px, default 1.5
  speed?: number;          // animation duration in seconds, default 5
  colors?: string[];       // gradient stops, defaults to teal → amber → primary
  innerClassName?: string; // classes applied to the inner content div
  paused?: boolean;        // pause the animation
}

export function AnimatedGradientBorder({
  children,
  className,
  borderWidth = 1.5,
  speed = 5,
  colors,
  innerClassName,
  paused = false,
}: AnimatedGradientBorderProps) {
  const stops = colors ?? [
    'hsl(171 100% 44%)',   // electric teal
    'hsl(38 90% 50%)',     // amber gold
    'hsl(250 70% 60%)',    // indigo accent
    'hsl(171 100% 44%)',   // back to teal
  ];

  const gradient = `linear-gradient(135deg, ${stops.join(', ')})`;

  return (
    <div
      className={cn('relative', className)}
      style={{ padding: borderWidth }}
    >
      {/* Animated gradient layer */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 rounded-[inherit] opacity-80',
          paused ? '' : 'animate-gradient-pan'
        )}
        style={{
          background: gradient,
          backgroundSize: '300% 300%',
          animationDuration: `${speed}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          zIndex: 0,
        }}
      />

      {/* Inner content — masks the gradient to show only the border */}
      <div
        className={cn(
          'relative z-10 rounded-[calc(var(--radius)-1px)] h-full w-full',
          'bg-background',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * GradientBorderCard
 * Convenience wrapper that applies AnimatedGradientBorder + Card styles
 */
export function GradientBorderCard({
  children,
  className,
  active = false,
  ...props
}: AnimatedGradientBorderProps & { active?: boolean }) {
  return (
    <AnimatedGradientBorder
      className={cn('rounded-2xl', !active && 'opacity-0 hover:opacity-100 focus-within:opacity-100', className)}
      innerClassName="bg-card"
      paused={!active}
      {...props}
    >
      {children}
    </AnimatedGradientBorder>
  );
}
