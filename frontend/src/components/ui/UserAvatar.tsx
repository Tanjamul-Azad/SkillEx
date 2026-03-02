
'use client';

import React from 'react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { MatchScoreRing } from './MatchScoreRing';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  showScoreRing?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
  xl: 'h-32 w-32',
};

export function UserAvatar({
  user,
  size = 'md',
  showOnline = false,
  showScoreRing = false,
  className,
}: UserAvatarProps) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {showScoreRing && (
        <MatchScoreRing score={user.skillexScore / 10} size={parseInt(sizeClasses[size].slice(2)) * 1.2} strokeWidth={2} />
      )}
      <Avatar className={cn('h-full w-full', showScoreRing && 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2')}>
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showOnline && user.isOnline && (
        <div className="absolute bottom-0 right-0 h-1/4 w-1/4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
      )}
    </div>
  );
}
