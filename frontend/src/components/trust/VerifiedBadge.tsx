import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { skillTrustService, type SkillTrust } from '@/services/skillTrustService';

export interface VerifiedBadgeProps {
  userId: string;
  skillId: string;
  skillName: string;
  onRequestCheck?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

type VerificationLevel = 'verified' | 'pending' | 'unverified';

export function VerifiedBadge({
  userId,
  skillId,
  skillName,
  onRequestCheck,
  size = 'md',
  showDetails = true,
}: VerifiedBadgeProps) {
  const [trust, setTrust] = useState<SkillTrust | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await skillTrustService.get(userId, skillId);
        setTrust(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userId, skillId]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="inline-flex items-center gap-1.5"
      >
        <Loader2 className={cn('animate-spin text-muted-foreground', {
          'h-3 w-3': size === 'sm',
          'h-4 w-4': size === 'md',
          'h-5 w-5': size === 'lg',
        })} />
      </motion.div>
    );
  }

  if (error || !trust) {
    return null;
  }

  const level: VerificationLevel = trust.score >= 70 ? 'verified' : 'pending';
  const isVerified = level === 'verified';
  const scorePercent = Math.min(100, Math.max(0, trust.score));
  const scoreColor = trust.score >= 70 ? 'text-green-600' : trust.score >= 40 ? 'text-amber-600' : 'text-red-600';

  const reasons = [
    ...(trust.completedTeachingSessions >= 3 && trust.averageSkillRating >= 4.0 ? [`${trust.completedTeachingSessions} sessions @ ${trust.averageSkillRating.toFixed(1)}★`] : []),
    ...(trust.proofUploaded ? ['Portfolio proof on file'] : []),
    ...(trust.skillCheckSuitableCount > 0 ? ['Skill check completed'] : []),
    ...(trust.adminVerified ? ['Admin verified'] : []),
  ];

  const badge = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      className="inline-flex items-center gap-1.5"
    >
      <Badge
        className={cn(
          'flex items-center gap-1.5 transition-all',
          isVerified
            ? 'bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-400'
            : 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400',
        )}
      >
        {isVerified ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Shield className="h-3.5 w-3.5" />
        )}
        <span className={cn('font-semibold', {
          'text-xs': size === 'sm',
          'text-sm': size === 'md',
          'text-base': size === 'lg',
        })}>
          {isVerified ? 'Verified' : 'Pending'}
        </span>
      </Badge>

      {showDetails && onRequestCheck && !isVerified && (
        <Button
          size="sm"
          variant="ghost"
          className="h-auto px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          onClick={onRequestCheck}
        >
          Request check
        </Button>
      )}
    </motion.div>
  );

  if (!showDetails) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {skillName} trust score
              </span>
              <span className={cn('font-bold text-lg', scoreColor)}>
                {scorePercent}
              </span>
            </div>

            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn('h-full rounded-full', {
                  'bg-green-500': trust.score >= 70,
                  'bg-amber-500': trust.score >= 40 && trust.score < 70,
                  'bg-red-500': trust.score < 40,
                })}
                initial={{ width: 0 }}
                animate={{ width: `${scorePercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {reasons.length > 0 && (
              <div className="space-y-1 border-t border-border/50 pt-2">
                {reasons.map((reason) => (
                  <div key={reason} className="flex items-start gap-1.5 text-xs">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
                    <span className="text-muted-foreground">{reason}</span>
                  </div>
                ))}
              </div>
            )}

            {reasons.length === 0 && (
              <div className="flex items-start gap-1.5 text-xs">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                <span className="text-muted-foreground">
                  Request a skill check to verify capability
                </span>
              </div>
            )}

            {!isVerified && (
              <div className="border-t border-border/50 pt-2">
                <p className="text-xs text-muted-foreground">
                  A skill check is a 15-min vetting call: live demo, goal alignment, schedule fit.
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
