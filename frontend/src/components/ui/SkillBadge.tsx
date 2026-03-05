
'use client';

import React from 'react';
import type { Skill } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { motion } from 'framer-motion';

interface SkillBadgeProps {
  skill: Skill;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  className?: string;
}

const levelColors = {
  beginner: 'bg-primary/70',
  moderate: 'bg-secondary/70',
  expert: 'bg-accent/70',
};

const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
}

export function SkillBadge({
  skill,
  size = 'md',
  showLevel = true,
  className,
}: SkillBadgeProps) {
  return (
    <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
        <Badge
          variant="outline"
          className={cn(
            'inline-flex items-center gap-2 border-border/80 bg-muted/50',
            sizeClasses[size],
            className
          )}
        >
          {/* <span className="text-lg">{skill.icon}</span> */}
          <span>{skill.name}</span>
          {showLevel && (
            <div className={cn("h-2 w-2 rounded-full", levelColors[skill.level])} />
          )}
        </Badge>
    </motion.div>
  );
}
