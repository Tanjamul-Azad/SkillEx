import React, { useState, useEffect, FC } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Users, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MatchScoreRing } from '@/components/ui';
import { Link } from 'react-router-dom';
import { RequestExchangeDialog } from '@/features/match/components/RequestExchangeDialog';
import { SkillGraphCard } from '@/features/match/components/SkillGraphCard';
import { useToast } from '@/hooks/use-toast';
import { UserService } from '@/services/userService';
import { exchangeService, type ExchangeRelationship } from '@/services/exchangeService';
import type { MatchUser } from '@/hooks/useMatchUsers';
import type { User } from '@/types';

interface AIBestMatchCardProps {
  match: MatchUser;
  currentUser: User | null;
}

export const AIBestMatchCard: FC<AIBestMatchCardProps> = React.memo(({ match, currentUser }) => {
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

  const myName = currentUser?.name ?? 'You';
  const score = match.compatibilityScore;
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative mb-4 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 dark:border-white/10 dark:bg-slate-950"
      >
        <div className="relative z-20 p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Badge className="mb-2 gap-1.5 border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary hover:bg-primary/15">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Recommended</span>
              </Badge>
              <h2 className="truncate font-headline text-xl font-extrabold text-foreground">Best match: {match.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Trade fit based on teach/learn overlap and reliability signals.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fit</span>
              <MatchScoreRing score={score} size={42} tone="secondary" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-xl border border-border/70 bg-background p-3 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-card ring-2 ring-primary/15">
                  <AvatarImage src={match.avatar ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-muted text-base font-bold text-foreground">{match.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="truncate font-headline text-lg font-extrabold">{match.name}</h3>
                  <p className="truncate text-xs font-medium text-muted-foreground">{match.university || 'SkillEX member'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {typeof match.rating === 'number' ? match.rating.toFixed(1) : '–'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {match.sessionsCompleted} sessions
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="min-w-0 rounded-lg border border-primary/15 bg-primary/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/85">They teach</p>
                  <p className="mt-1 truncate font-bold text-foreground">{match.teachesYou?.[0] ?? 'Open skill'}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border/70 bg-background/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">They want</p>
                  <p className="mt-1 truncate font-bold text-foreground">{match.wantsToLearnFromYou?.[0] ?? 'Exchange'}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background p-3 dark:border-white/10 dark:bg-slate-900">
                  <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Match Metrics</h4>
                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                        <span>Skill Similarity</span>
                        <span className="text-primary">{match.semanticSimilarity}%</span>
                      </div>
                      <Progress value={match.semanticSimilarity} className="h-1.5 bg-primary/10" indicatorClassName="bg-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                        <span>Rating</span>
                        <span className="text-warning">{typeof match.rating === 'number' ? match.rating.toFixed(1) : '–'}</span>
                      </div>
                      <Progress value={typeof match.rating === 'number' ? Math.round((match.rating / 5) * 100) : 0} className="h-1.5 bg-warning/10" indicatorClassName="bg-warning" />
                    </div>
                  </div>
                </div>

                <div className="min-h-[104px] rounded-xl border border-border/70 bg-background p-3 dark:border-white/10 dark:bg-slate-900">
                  <SkillGraphCard
                    offeredSkills={match.wantsToLearnFromYou ?? []}
                    wantedSkills={match.teachesYou ?? []}
                    userName={myName.split(' ')[0]}
                  />
                </div>
              </div>

              {match.matchReasons.length > 0 && (
                <div className="rounded-xl border border-border/70 bg-background p-3 dark:border-white/10 dark:bg-slate-900">
                  <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/80">
                    <Zap className="h-3 w-3" /> Why this match?
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {match.matchReasons.slice(0, 2).map((reason: string) => (
                      <Badge key={reason} variant="secondary" className="max-w-full truncate border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {exchangeRelation?.status === 'ACCEPTED' ? (
                  <Button asChild variant="gradient" className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider">
                    <Link to="/dashboard#active-exchanges">Arrange Meeting</Link>
                  </Button>
                ) : exchangeRelation?.status === 'DECLINED' ? (
                  <Button variant="outline" className="h-9 rounded-xl border-rose-500/30 bg-rose-500/10 text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-500/10 disabled:opacity-100 dark:text-rose-400" disabled>
                    Rejected
                  </Button>
                ) : exchangeRelation?.status === 'PENDING_SENT' ? (
                  <Button variant="outline" className="h-9 rounded-xl border-primary/20 bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary disabled:opacity-100" disabled>
                    Request Sent
                  </Button>
                ) : exchangeRelation?.status === 'PENDING_RECEIVED' ? (
                  <Button variant="outline" className="h-9 rounded-xl border-amber-500/30 bg-amber-500/10 text-xs font-bold uppercase tracking-wider text-amber-600 disabled:opacity-100" disabled>
                    Incoming Request
                  </Button>
                ) : (
                  <Button variant="gradient" className="h-9 rounded-xl text-xs font-bold uppercase tracking-wider shadow-none" onClick={openRequestDialog} disabled={loadingProfile}>
                    {loadingProfile ? 'Loading Profile' : 'Request Exchange'}
                  </Button>
                )}
                <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-background/60 text-xs font-bold uppercase tracking-wider hover:bg-muted/40" asChild>
                  <Link to={`/profile/${match.id}`}>View Profile</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
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

AIBestMatchCard.displayName = 'AIBestMatchCard';
