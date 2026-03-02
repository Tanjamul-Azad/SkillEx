
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Lightbulb, Repeat, Trophy } from 'lucide-react';

interface SkillExScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tiers = [
  { name: 'Newcomer', minScore: 0, icon: '🌱', color: 'bg-gray-400 text-gray-900' },
  { name: 'Explorer', minScore: 201, icon: '🔭', color: 'bg-blue-400 text-blue-900' },
  { name: 'Exchanger', minScore: 401, icon: Repeat, color: 'bg-green-400 text-green-900' },
  { name: 'Expert', minScore: 601, icon: Lightbulb, color: 'bg-purple-400 text-purple-900' },
  { name: 'Skill Champion', minScore: 801, icon: Trophy, color: 'gradient-bg text-primary-foreground shimmer' },
];

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
}

export function SkillExScoreBadge({
  score,
  showLabel = true,
  size = 'md',
  className,
}: SkillExScoreBadgeProps) {
  const tier = tiers.slice().reverse().find(t => score >= t.minScore) || tiers[0];
  const nextTier = tiers.find(t => score < t.minScore);
  const pointsToNext = nextTier ? nextTier.minScore - score : 0;

  const IconComponent = (props: { className?: string }) => {
    if (typeof tier.icon === 'string') {
      return <span className={props.className}>{tier.icon}</span>;
    }
    const LucideIcon = tier.icon;
    return <LucideIcon {...props} />;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
                'gap-2 border-transparent',
                tier.color,
                sizeClasses[size],
                className
            )}
          >
            <IconComponent className={cn(iconSizeClasses[size])} />
            {showLabel && <span>{tier.name}</span>}
            <span>({score})</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-bold">{tier.name} Tier</p>
          {nextTier && (
            <p className="text-xs text-muted-foreground">{pointsToNext} points to reach {nextTier.name}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

