import React, { useState, useEffect, FC } from 'react';
import { Star, Users, Zap, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MatchScoreRing } from '@/components/ui';
import { Link } from 'react-router-dom';
import { RequestExchangeDialog } from '@/features/match/components/RequestExchangeDialog';
import { useToast } from '@/hooks/use-toast';
import { UserService } from '@/services/userService';
import { exchangeService, type ExchangeRelationship } from '@/services/exchangeService';
import type { MatchUser } from '@/hooks/useMatchUsers';
import type { User } from '@/types';

interface MatchCardProps {
  match: MatchUser;
}

export const MatchCard: FC<MatchCardProps> = React.memo(({ match }) => {
  const [requestOpen, setRequestOpen] = useState(false);
  const [exchangeRelation, setExchangeRelation] = useState<ExchangeRelationship | null>(null);
  const [dialogTarget, setDialogTarget] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const fetchRelation = async () => {
      try {
        const res = await exchangeService.getRelationship(match.id);
        if (active) {
          setExchangeRelation(res);
        }
      } catch (err) {
        console.error('Error fetching exchange relationship:', err);
      }
    };
    fetchRelation();
    return () => {
      active = false;
    };
  }, [match.id]);

  const openRequestDialog = async () => {
    setLoadingProfile(true);
    try {
      const fullProfile = await UserService.getById(match.id);
      setDialogTarget(fullProfile);
      setRequestOpen(true);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not open request',
        description: 'The full profile could not be loaded. Please try again.',
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <>
      <Card className="group relative flex h-full min-h-[290px] flex-col overflow-hidden rounded-2xl surface-raised hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_44px_-24px_hsl(var(--primary)/0.35)]">
        <CardContent className="relative z-10 flex flex-1 flex-col p-4">
          <div className="absolute right-4 top-4">
            <MatchScoreRing score={match.compatibilityScore} size={42} tone="secondary" className="drop-shadow-md"/>
          </div>
          <div className="relative z-20 flex items-center gap-3 pr-12">
            <Avatar className="h-12 w-12 bg-card shadow-lg ring-2 ring-border transition-all group-hover:ring-primary/30">
              <AvatarImage src={match.avatar ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-muted text-foreground font-bold">{match.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate font-headline text-base font-bold leading-tight">{match.name}</h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{match.university || 'SkillEX member'}</p>
              {match.isOnline && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_var(--emerald-500)]" />
                  Online
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {match.teachesYou?.[0] && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Teaches</span>
                <span className="flex-1 truncate text-xs font-bold">{match.teachesYou[0]}</span>
              </div>
            )}
            {match.wantsToLearnFromYou?.[0] && (
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
                <span className="w-12 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wants</span>
                <span className="flex-1 truncate text-xs font-semibold">{match.wantsToLearnFromYou[0]}</span>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-semibold text-muted-foreground">
            <div className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {typeof match.rating === 'number' ? match.rating.toFixed(1) : '–'}</div>
            <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {match.sessionsCompleted}</div>
            <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> {match.skillexScore}</div>
            <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> {match.semanticSimilarity}% sim</div>
          </div>
          {match.matchReasons?.[0] && (
            <div className="mt-4 line-clamp-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary/90">
              {match.matchReasons[0]}
            </div>
          )}
        </CardContent>
        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/10 p-3 dark:border-white/10">
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider" asChild>
            <Link to={`/profile/${match.id}`}>Profile</Link>
          </Button>
          {exchangeRelation?.status === 'ACCEPTED' ? (
            <Button
              asChild
              size="sm"
              variant="gradient"
              className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider shadow-none"
            >
              <Link to="/dashboard#active-exchanges">Meeting</Link>
            </Button>
          ) : exchangeRelation?.status === 'DECLINED' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"
              disabled
            >
              Rejected
            </Button>
          ) : exchangeRelation?.status === 'PENDING_SENT' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider text-primary"
              disabled
            >
              Sent
            </Button>
          ) : exchangeRelation?.status === 'PENDING_RECEIVED' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-600"
              disabled
            >
              Incoming
            </Button>
          ) : (
            <Button
              onClick={openRequestDialog}
              size="sm"
              variant="gradient"
              className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider shadow-none"
              disabled={loadingProfile}
            >
              {loadingProfile ? 'Loading' : 'Request'}
            </Button>
          )}
        </div>
      </Card>
      <RequestExchangeDialog
        open={requestOpen && !!dialogTarget}
        onClose={() => setRequestOpen(false)}
        targetUser={dialogTarget ?? (match as unknown as User)}
        onSuccess={() => {
          setExchangeRelation({
            targetUserId: match.id,
            status: 'PENDING_SENT',
            exchangeId: null,
          });
        }}
      />
    </>
  );
});

MatchCard.displayName = 'MatchCard';
