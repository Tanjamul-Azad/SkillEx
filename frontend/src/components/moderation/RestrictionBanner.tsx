import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { moderationService, type UserRestriction } from '@/services/moderationService';
import { cn } from '@/lib/utils';

export function RestrictionBanner({ className }: { className?: string }) {
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([]);

  useEffect(() => {
    moderationService.myRestrictions()
      .then(setRestrictions)
      .catch(() => {});
  }, []);

  if (restrictions.length === 0) return null;

  const strongest = restrictions[0];
  return (
    <div className={cn('mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100', className)}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Account status: {strongest.restrictionType.split('_').join(' ')}</p>
          <p className="text-xs opacity-85">{strongest.reason}</p>
          {strongest.endsAt && <p className="mt-1 text-xs opacity-70">Ends {new Date(strongest.endsAt).toLocaleString()}</p>}
        </div>
      </div>
    </div>
  );
}
