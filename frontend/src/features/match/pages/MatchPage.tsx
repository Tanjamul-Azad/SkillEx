
import React, { useState, useMemo, FC, useCallback, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMatchUsers, type MatchUser } from '@/hooks/useMatchUsers';
import { useTopCycles } from '@/hooks/useTopCycles';
import { SkillGraphCard } from '@/features/match/components/SkillGraphCard';
import type { ExchangeCycleData, ScoredCycleDto } from '@/features/match/components/ExchangeChainCard';
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  Search,
  Star,
  Sparkles,
  Users,
  Zap,
  RefreshCw,
  ServerCrash,
  ArrowRight,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  GitMerge,
  RotateCcw,
  Network,
  Clock3,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { Link } from 'react-router-dom';
import { MatchScoreRing } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { RequestExchangeDialog } from '@/features/match/components/RequestExchangeDialog';
import { useToast } from '@/hooks/use-toast';
import { UserService } from '@/services/userService';
import { exchangeService, type ExchangeRelationship } from '@/services/exchangeService';
import { connectionService } from '@/services/connectionService';
import { MarketplaceCard } from '@/features/match/components/MarketplaceCard';

const categories = [
  { id: 'Tech', name: 'Technology' },
  { id: 'Creative', name: 'Creative' },
  { id: 'Design', name: 'Design' },
  { id: 'Business', name: 'Business' },
  { id: 'Communication', name: 'Communication' },
  { id: 'Language', name: 'Language' },
  { id: 'Lifestyle', name: 'Lifestyle' },
];

type Filters = {
  categories: string[];
  levels: string[];
  sessionType: string;
  compatibility: number[];
  rating: number;
  search: string;
};

const defaultFilters: Filters = {
  categories: [],
  levels: [],
  sessionType: 'Both',
  compatibility: [50],
  rating: 0,
  search: '',
};

const FilterSidebar: FC<{
  filters: Filters;
  setFilters: (f: Filters) => void;
  onApply?: () => void;
  mobileSheetOpen: boolean;
  setMobileSheetOpen: (open: boolean) => void;
}> = React.memo(({ filters, setFilters, onApply: _onApply, mobileSheetOpen, setMobileSheetOpen }) => {
  const PillToggle: FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ease-snappy',
        active
          ? 'border border-primary/45 bg-primary/15 text-primary shadow-[0_0_16px_hsl(var(--primary)/0.12)]'
          : 'border border-border/70 bg-muted/20 text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
      )}
    >
      {label}
    </motion.button>
  );

  const content = (
    <div className="flex h-full flex-col gap-4 overflow-y-auto custom-scrollbar p-4">
      {/* Categories */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Sparkles className="h-3 w-3 text-primary"/> Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <PillToggle
              key={category.id}
              label={category.name}
              active={filters.categories.includes(category.id)}
              onClick={() => {
                setFilters({
                  ...filters,
                  categories: filters.categories.includes(category.id)
                    ? filters.categories.filter((c) => c !== category.id)
                    : [...filters.categories, category.id],
                });
              }}
            />
          ))}
        </div>
      </div>

      {/* Levels */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Level</h3>
        <div className="flex flex-wrap gap-2">
          {['beginner', 'moderate', 'expert'].map((level) => (
            <PillToggle
              key={level}
              label={level.charAt(0).toUpperCase() + level.slice(1)}
              active={filters.levels.includes(level)}
              onClick={() => {
                setFilters({
                  ...filters,
                  levels: filters.levels.includes(level)
                    ? filters.levels.filter((l) => l !== level)
                    : [...filters.levels, level],
                });
              }}
            />
          ))}
        </div>
      </div>

      {/* Session Type */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session Type</h3>
        <div className="flex flex-wrap gap-2">
          {['Online', 'In-person', 'Both'].map((type) => (
            <PillToggle
              key={type}
              label={type}
              active={filters.sessionType === type}
              onClick={() => setFilters({ ...filters, sessionType: type })}
            />
          ))}
        </div>
      </div>

      {/* Minimum Compatibility */}
      <div className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.04)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Min Match</h3>
          <span className="text-lg font-headline font-bold text-primary drop-shadow-[0_0_8px_var(--primary)]">{filters.compatibility[0]}%</span>
        </div>
        <Slider
          value={filters.compatibility}
          onValueChange={(value) => setFilters({ ...filters, compatibility: value })}
          max={100}
          min={50}
          step={1}
          className="w-full"
        />
      </div>

      {/* Minimum Rating */}
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Minimum Rating</h3>
        <div className="flex gap-2">
          {[3, 4, 4.5].map((r) => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilters({ ...filters, rating: filters.rating === r ? 0 : r })}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase transition-all duration-300 ease-snappy',
                filters.rating === r
                  ? 'bg-warning/20 text-warning border border-warning/50 shadow-[0_0_12px_var(--warning)]'
                  : 'bg-muted/20 text-muted-foreground border border-white/5 hover:border-warning/30 hover:bg-muted/40'
              )}
            >
              <span>{r}</span>
              <Star className="h-3.5 w-3.5 fill-current" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reset button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setFilters(defaultFilters)}
        className="mt-1 w-full rounded-full border border-border/70 bg-muted/20 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-all duration-300 ease-snappy hover:border-primary/30 hover:bg-muted/40"
      >
        Reset Filters
      </motion.button>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 overflow-hidden border-r border-border/60 bg-card/35 md:block h-[calc(100vh-64px)] sticky top-16">
        {content}
      </aside>

      <div className="md:hidden">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-24 right-4 z-40 rounded-full shadow-lg"
              aria-label="Open filters"
            >
              <SlidersHorizontal />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-sm p-0 bg-background/95 backdrop-blur-xl">
            <SheetHeader className="border-b border-border/60 p-4">
              <SheetTitle className="flex items-center justify-between">
                Filters
                <Button 
                  variant="link" 
                  className="p-0 text-xs text-muted-foreground hover:text-foreground" 
                  onClick={() => setFilters(defaultFilters)}
                >
                  Reset
                </Button>
              </SheetTitle>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
});
FilterSidebar.displayName = 'FilterSidebar';

const AIBestMatchCard: FC<{ match: MatchUser; currentUser: User | null }> = React.memo(({ match, currentUser }) => {
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
        className="group relative mb-4 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm transition-colors duration-300 hover:border-primary/30"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-70" />

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
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
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
                <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
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

                <div className="min-h-[104px] rounded-xl border border-border/60 bg-muted/15 p-3">
                  <SkillGraphCard
                    offeredSkills={match.wantsToLearnFromYou ?? []}
                    wantedSkills={match.teachesYou ?? []}
                    userName={myName.split(' ')[0]}
                  />
                </div>
              </div>

              {match.matchReasons.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
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

const MatchCard: FC<{ match: MatchUser }> = React.memo(({ match }) => {
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
      <Card className="group relative flex h-full min-h-[290px] flex-col overflow-hidden rounded-2xl border-border/70 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_44px_-24px_hsl(var(--primary)/0.35)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

        <div className="pointer-events-none absolute -right-16 -top-20 h-36 w-36 rounded-full bg-primary/12 blur-3xl transition-opacity duration-300 group-hover:opacity-90" />

        <CardContent className="relative z-10 flex flex-1 flex-col p-4">
          <div className="absolute right-4 top-4"><MatchScoreRing score={match.compatibilityScore} size={42} tone="secondary" className="drop-shadow-md"/></div>
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ChainFilter = 'all' | 'mine' | 'swap' | 'multi';

type ChainRequestTarget = {
  userId: string;
  userName: string;
  skillId: string;
  skillName: string;
  actionLabel: string;
};

const isPersistedId = (value?: string) => Boolean(value && UUID_PATTERN.test(value));

function validChains(cycles: ScoredCycleDto[]) {
  return cycles.filter((item) => {
    const cycle = item.cycle;
    return cycle?.userIds?.length >= 2
      && cycle.userNames.length === cycle.userIds.length
      && cycle.hops.length === cycle.userIds.length
      && cycle.hops.every((hop) => hop.fromUserId && hop.toUserId && hop.primarySkillName);
  });
}

function chainTarget(cycle: ExchangeCycleData, currentUserId?: string): ChainRequestTarget | null {
  if (!currentUserId || cycle.hops.length === 0) return null;
  const isParticipant = cycle.userIds.includes(currentUserId);
  const hop = isParticipant
    ? cycle.hops.find((item) => item.toUserId === currentUserId)
    : cycle.hops[0];

  const skillId = hop?.matchingSkillIds?.find(isPersistedId);
  if (!hop || !skillId) return null;

  return {
    userId: hop.fromUserId,
    userName: hop.fromUserName,
    skillId,
    skillName: hop.primarySkillName,
    actionLabel: isParticipant ? 'Start chain' : 'Request swap',
  };
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function chainKey(item: ScoredCycleDto) {
  return `${item.cycle.userIds.join(':')}:${item.score}`;
}

function chainTitle(cycle: ExchangeCycleData) {
  const first = cycle.hops[0]?.primarySkillName ?? 'Skill';
  const last = cycle.hops[cycle.hops.length - 1]?.primarySkillName ?? 'Skill';
  return `${first} -> ${last}`;
}

function chainVia(cycle: ExchangeCycleData) {
  const middle = cycle.hops.slice(1, -1).map((hop) => hop.primarySkillName).filter(Boolean);
  return middle.length ? `via ${middle.slice(0, 3).join(', ')}` : `${cycle.hops.length} verified swaps`;
}

function estimatedTime(cycle: ExchangeCycleData) {
  if (cycle.hops.length <= 2) return '~1 week';
  if (cycle.hops.length <= 4) return '~2 weeks';
  return '~2-3 weeks';
}

function ChainAvatarPath({ cycle, currentUserId, compact = false }: { cycle: ExchangeCycleData; currentUserId?: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
      {cycle.hops.map((hop, index) => {
        const isCurrent = hop.fromUserId === currentUserId;
        return (
          <React.Fragment key={`${hop.fromUserId}-${hop.toUserId}-${hop.primarySkillName}-${index}`}>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <Avatar className={cn(
                compact ? 'h-9 w-9' : 'h-12 w-12',
                'border border-border bg-background ring-2 ring-background',
                isCurrent && 'border-primary ring-primary/30'
              )}>
                <AvatarFallback className={cn('font-bold', compact ? 'text-[10px]' : 'text-xs', isCurrent ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground')}>
                  {isCurrent ? 'YOU' : initials(hop.fromUserName)}
                </AvatarFallback>
              </Avatar>
              {!compact && (
                <div className="max-w-[110px] text-center">
                  <p className="truncate text-xs font-bold">{isCurrent ? 'You' : hop.fromUserName}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-primary">Offers {hop.primarySkillName}</p>
                </div>
              )}
            </div>
            {index < cycle.hops.length - 1 ? (
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            ) : (
              <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ScoreDonut({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-full', size === 'sm' ? 'h-10 w-10' : 'h-14 w-14')}
      style={{ background: `conic-gradient(hsl(var(--secondary)) ${clamped * 3.6}deg, hsl(var(--muted)) 0deg)` }}
    >
      <div className={cn('grid place-items-center rounded-full bg-card font-headline font-extrabold', size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-10 w-10 text-sm')}>
        {score}
      </div>
    </div>
  );
}

function ChainMetric({ icon: Icon, value, label }: { icon: React.FC<{ className?: string }>; value: string | number; label: string }) {
  return (
    <div className="product-kpi">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="font-headline text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChainTableRow({
  item,
  rank,
  currentUserId,
  selected,
  onSelect,
  onAction,
}: {
  item: ScoredCycleDto;
  rank: number;
  currentUserId?: string;
  selected: boolean;
  onSelect: () => void;
  onAction: (cycle: ExchangeCycleData) => void;
}) {
  const { cycle } = item;
  const target = chainTarget(cycle, currentUserId);
  const swaps = Math.max(1, cycle.hops.length - 1);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'product-row grid min-w-[1000px] grid-cols-[190px_minmax(200px,1fr)_105px_70px_70px_110px_160px] items-center gap-4 px-5 py-4',
        selected && 'bg-primary/[0.045]'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-xs font-bold text-primary">
          {rank}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{chainTitle(cycle)}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{chainVia(cycle)}</p>
        </div>
      </div>

      <ChainAvatarPath cycle={cycle} currentUserId={currentUserId} compact />

      <div className="flex items-center gap-3">
        <ScoreDonut score={item.score} size="sm" />
        <div>
          <p className="text-sm font-extrabold">{item.score}%</p>
          <p className="text-xs text-muted-foreground">{item.score >= 75 ? 'Great fit' : item.score >= 60 ? 'Good fit' : 'Fair fit'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4 text-muted-foreground" />
        {cycle.userIds.length}
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold">
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        {swaps}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock3 className="h-4 w-4" />
        {estimatedTime(cycle)}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="h-9 rounded-xl px-2.5 text-xs font-bold" onClick={onSelect}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
        <Button
          size="sm"
          variant={target ? 'gradient' : 'outline'}
          className="h-9 rounded-xl px-2.5 text-xs font-bold shadow-none"
          disabled={!target}
          onClick={() => onAction(cycle)}
        >
          {target?.actionLabel ?? 'Unavailable'}
        </Button>
      </div>
    </motion.div>
  );
}

const SkillChainsTabV2 = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cycles, loading, error, refetch } = useTopCycles({ limit: 20 });
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinTargetUser, setJoinTargetUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<ChainFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const sortedCycles = useMemo(() => validChains(cycles).sort((a, b) => b.score - a.score), [cycles]);
  const selectedCycle = useMemo(
    () => sortedCycles.find((item) => chainKey(item) === selectedKey) ?? sortedCycles[0],
    [selectedKey, sortedCycles]
  );
  const perfectSwaps = useMemo(() => sortedCycles.filter(c => c.cycle.hops.length === 2), [sortedCycles]);
  const multiChains = useMemo(() => sortedCycles.filter(c => c.cycle.hops.length > 2), [sortedCycles]);
  const totalParticipants = useMemo(() => new Set(sortedCycles.flatMap(c => c.cycle.userIds)).size, [sortedCycles]);
  const averageScore = sortedCycles.length
    ? Math.round(sortedCycles.reduce((sum, c) => sum + c.score, 0) / sortedCycles.length)
    : 0;
  const bestScore = selectedCycle?.score ?? 0;
  const visibleCycles = useMemo(() => {
    switch (filter) {
      case 'mine':
        return sortedCycles.filter(c => user?.id && c.cycle.userIds.includes(user.id));
      case 'swap':
        return perfectSwaps;
      case 'multi':
        return multiChains;
      default:
        return sortedCycles;
    }
  }, [filter, multiChains, perfectSwaps, sortedCycles, user?.id]);

  const openChainRequest = useCallback((cycle: ExchangeCycleData) => {
    const target = chainTarget(cycle, user?.id);
    if (!target) {
      toast({
        variant: 'destructive',
        title: 'Chain request unavailable',
        description: 'This chain does not expose a valid persisted skill for a request yet.',
      });
      return;
    }

    setJoinTargetUser({
      id: target.userId,
      name: target.userName,
      email: `${target.userId}@chain.local`,
      avatar: '',
      university: 'Skill Chain Match',
      bio: 'Selected from the live skill-chain engine.',
      skillsOffered: [{
        id: target.skillId,
        name: target.skillName,
        icon: '',
        category: 'General',
        description: `${target.skillName} exchange opportunity`,
        level: 'moderate' as const,
      }],
      skillsWanted: [],
      skillexScore: 0,
      level: 'Member',
      sessionsCompleted: 0,
      rating: 0,
      isOnline: false,
      joinedAt: new Date().toISOString(),
    });
    setJoinDialogOpen(true);
  }, [toast, user?.id]);

  return (
    <div className="space-y-5">
      <section className="product-panel">
        <div className="flex flex-col gap-4 border-b border-border/70 p-5 md:flex-row md:items-start md:justify-between dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary">
              <Network className="h-5 w-5" />
              <h2 className="font-headline text-2xl font-extrabold tracking-tight">Skill Chain Engine</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Compute the best multi-person exchange path from real offered and wanted skills.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
            <span>Live data</span>
            <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 text-xs font-bold" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,1fr)]">
          <div className="border-b border-border/70 p-5 lg:border-b-0 lg:border-r dark:border-white/10">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-base font-bold">Best path</p>
              {selectedCycle && (
                <Badge className="rounded-xl border border-secondary/35 bg-secondary/10 px-3 py-1 text-secondary hover:bg-secondary/10">
                  {selectedCycle.score}% match
                </Badge>
              )}
            </div>

            {selectedCycle ? (
              <>
                <ChainAvatarPath cycle={selectedCycle.cycle} currentUserId={user?.id} />
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground dark:border-white/10">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> {selectedCycle.cycle.userIds.length} people</span>
                  <span className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> {Math.max(1, selectedCycle.cycle.hops.length - 1)} swaps</span>
                  <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {estimatedTime(selectedCycle.cycle)}</span>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/35 p-6 text-sm text-muted-foreground">
                Add offered and wanted skills to unlock live chain detection.
              </div>
            )}
          </div>

          <div className="p-5">
            <p className="mb-5 text-base font-bold">Live chains</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ChainMetric icon={Network} value={sortedCycles.length} label="Active chains" />
              <ChainMetric icon={ArrowLeftRight} value={perfectSwaps.length} label="2-way swaps" />
              <ChainMetric icon={Users} value={totalParticipants} label="Participants" />
              <ChainMetric icon={ShieldCheck} value={`${bestScore || averageScore}%`} label="Best score" />
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Computed from real offered and wanted skills. No saved chain record is required.
            </div>
          </div>
        </div>
      </section>

      <section className="product-panel">
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 pt-3 md:flex-row md:items-center md:justify-between dark:border-white/10">
          <div className="flex gap-7 overflow-x-auto">
            {[
              { id: 'all' as const, label: 'All Chains' },
              { id: 'swap' as const, label: '2-way Swaps' },
              { id: 'multi' as const, label: 'Multi-person' },
              { id: 'mine' as const, label: 'Mine' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cn('product-tab shrink-0', filter === option.id && 'product-tab-active')}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mb-3 h-9 rounded-xl gap-2 text-xs font-bold" onClick={refetch} disabled={loading}>
            <SlidersHorizontal className="h-4 w-4" />
            Update
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[1000px] grid-cols-[190px_minmax(200px,1fr)_105px_70px_70px_110px_160px] gap-4 border-b border-border/70 px-5 py-3 text-xs font-bold text-muted-foreground dark:border-white/10">
            <span>Chain</span>
            <span>Path</span>
            <span>Match</span>
            <span>People</span>
            <span>Swaps</span>
            <span>Est. time</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="min-w-[1000px] space-y-0">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="product-row grid grid-cols-[190px_minmax(200px,1fr)_105px_70px_70px_110px_160px] gap-4 px-5 py-4">
                  {[150, 200, 86, 44, 44, 80, 120].map((width, idx) => (
                    <Skeleton key={idx} className="h-8 rounded-lg" style={{ width }} />
                  ))}
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
                <ServerCrash className="mx-auto mb-3 h-8 w-8 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Could not load skill chains.</p>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
                <Button className="mt-4 rounded-xl" onClick={refetch}>Try again</Button>
              </div>
            </div>
          ) : visibleCycles.length === 0 ? (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/35 px-6 py-12 text-center">
                <GitMerge className="h-9 w-9 text-muted-foreground/55" />
                <p className="mt-4 text-sm font-bold">No chains in this view</p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  The live graph has no matching path for the selected filter. Try All Chains or update profile skills.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visibleCycles.map((item, index) => {
                const key = chainKey(item);
                return (
                  <ChainTableRow
                    key={key}
                    item={item}
                    rank={index + 1}
                    currentUserId={user?.id}
                    selected={key === (selectedCycle ? chainKey(selectedCycle) : '')}
                    onSelect={() => setSelectedKey(key)}
                    onAction={openChainRequest}
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {!loading && !error && visibleCycles.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/70 px-5 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between dark:border-white/10">
            <span>Showing 1 to {visibleCycles.length} of {sortedCycles.length} chains</span>
            <span>Average score {averageScore}%</span>
          </div>
        )}
      </section>

      {joinTargetUser && (
        <RequestExchangeDialog
          open={joinDialogOpen}
          onClose={() => {
            setJoinDialogOpen(false);
            setJoinTargetUser(null);
          }}
          targetUser={joinTargetUser}
        />
      )}
    </div>
  );
};


const LoadingSkeletons = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
    {[...Array(6)].map((_, i) => <Skeleton key={i} variant="card" />)}
  </div>
);

const EmptyState: FC<{ onReset: () => void, isChain?: boolean }> = ({ onReset, isChain }) => (
  <div className="flex w-full flex-col items-center justify-center rounded-3xl border border-border/70 bg-card/70 px-6 py-14 text-center shadow-sm">
    <div className="rounded-2xl border border-primary/25 bg-primary/12 p-4 shadow-[0_0_24px_hsl(var(--primary)/0.12)]">
      <ServerCrash className="h-9 w-9 text-primary" />
    </div>
    <h2 className="mt-5 font-headline text-xl font-bold">
      {isChain ? 'No Chains Found' : 'No Matches Found'}
    </h2>
    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
      {isChain
        ? 'There are no multi-person skill chains available for you right now.'
        : 'Try adjusting your filters to find more skill exchange opportunities.'
      }
    </p>
    <Button
      onClick={onReset}
      className="mt-6 gap-2 rounded-xl font-bold"
      size="sm"
    >
      <RefreshCw className="h-4 w-4" /> Reset Filters
    </Button>
  </div>
);

type MarketplaceSort = 'rating' | 'sessions' | 'score' | 'newest';
type MarketplaceSkillMode = 'all' | 'offered' | 'wanted';

const MARKETPLACE_PAGE_SIZE = 16;
const MARKETPLACE_PAGE_SIZE_OPTIONS = [16, 24, 36, 48] as const;

export default function MatchPage() {
  useDocumentTitle('Find a Match');
  const { user } = useAuth();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'direct' | 'chain' | 'marketplace'>('direct');
  const [sortOption, setSortOption] = useState('best');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [marketplaceUsers, setMarketplaceUsers] = useState<User[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [marketplaceSort, setMarketplaceSort] = useState<MarketplaceSort>('rating');
  const [marketplaceSkillMode, setMarketplaceSkillMode] = useState<MarketplaceSkillMode>('all');
  const [marketplacePage, setMarketplacePage] = useState(1);
  const [marketplacePageSize, setMarketplacePageSize] = useState<number>(MARKETPLACE_PAGE_SIZE);
  const [marketplaceCategory, setMarketplaceCategory] = useState('all');
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());

  const { users, loading } = useMatchUsers({ search: filters.search, limit: 50 });

  useEffect(() => {
    if (!user?.id) {
      setConnectedUserIds(new Set());
      return;
    }

    let active = true;
    Promise.all([
      connectionService.list('ACCEPTED', 'all', 0, 100),
      exchangeService.list('ACCEPTED', 0, 100),
    ])
      .then(([connectionResult, exchangeResult]) => {
        if (!active) return;
        const ids = new Set<string>();
        (connectionResult.content ?? []).forEach((connection) => {
          const partner = connection.requester.id === user.id ? connection.receiver : connection.requester;
          ids.add(partner.id);
        });
        (exchangeResult.content ?? []).forEach((exchange) => {
          const partner = exchange.requester.id === user.id ? exchange.receiver : exchange.requester;
          ids.add(partner.id);
        });
        setConnectedUserIds(ids);
      })
      .catch(() => {
        if (active) setConnectedUserIds(new Set());
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const loadMarketplaceUsers = useCallback(async () => {
    setMarketplaceLoading(true);
    setMarketplaceError(null);
    try {
      const pageSize = 100;
      let page = 1;
      let total = Number.POSITIVE_INFINITY;
      const all: User[] = [];

      while (all.length < total) {
        const response = await UserService.getAll(page, pageSize);
        const content = response.content ?? [];
        total = response.totalElements ?? content.length;
        all.push(...content);

        if (content.length === 0 || content.length < pageSize) {
          break;
        }
        page += 1;
      }

      const uniqueUsers = Array.from(new Map(all.map((u) => [u.id, u])).values());
      setMarketplaceUsers(uniqueUsers.filter((u) => u.id !== user?.id && !connectedUserIds.has(u.id)));
    } catch {
      setMarketplaceError('Could not load the marketplace right now. Please try again.');
    } finally {
      setMarketplaceLoading(false);
    }
  }, [connectedUserIds, user?.id]);

  useEffect(() => {
    if (activeTab === 'marketplace' && marketplaceUsers.length === 0 && !marketplaceLoading && !marketplaceError) {
      void loadMarketplaceUsers();
    }
  }, [activeTab, marketplaceUsers.length, marketplaceLoading, marketplaceError, loadMarketplaceUsers]);

  const filteredMatches = useMemo(() => {
    return users.filter((u) => {
      if (connectedUserIds.has(u.id)) return false;
      // category / level: not available per-skill in MatchUserDto — skip unless no filter set
      const matchesCategory = filters.categories.length === 0;
      const matchesLevel = filters.levels.length === 0
        || filters.levels.includes(u.level?.toLowerCase?.() ?? '');
      const matchesCompatibility = u.compatibilityScore >= filters.compatibility[0];
      const matchesRating = u.rating >= filters.rating;
      return matchesCategory && matchesLevel && matchesCompatibility && matchesRating;
    }).sort((a, b) => {
      switch (sortOption) {
        case 'rating': return b.rating - a.rating;
        case 'sessions': return (b.sessionsCompleted ?? 0) - (a.sessionsCompleted ?? 0);
        default: return b.compatibilityScore - a.compatibilityScore;
      }
    });
  }, [users, filters, sortOption, connectedUserIds]);

  const bestMatch = useMemo(() => (activeTab === 'direct' && filteredMatches.length > 0) ? filteredMatches[0] : null, [filteredMatches, activeTab]);
  const otherMatches = useMemo(() => (activeTab === 'direct' && filteredMatches.length > 0) ? filteredMatches.slice(1) : [], [filteredMatches, activeTab]);
  const activeFilterCount = filters.categories.length + filters.levels.length + (filters.sessionType !== 'Both' ? 1 : 0) + (filters.compatibility[0] > 50 ? 1 : 0) + (filters.rating > 0 ? 1 : 0);

  const marketplaceSourceUsers = useMemo<User[]>(() => {
    const hasDirectorySkills = marketplaceUsers.some(
      (u) => (u.skillsOffered?.length ?? 0) > 0 || (u.skillsWanted?.length ?? 0) > 0
    );

    if (marketplaceUsers.length > 0 && hasDirectorySkills) {
      return marketplaceUsers.filter((u) => !connectedUserIds.has(u.id));
    }

    return users.filter((u) => !connectedUserIds.has(u.id)).map((u) => {
      const offeredNames = Array.from(new Set(u.teachesYou ?? []));
      const wantedNames = Array.from(new Set(u.wantsToLearnFromYou ?? []));
      const fallbackLevel = 'beginner';

      return {
        id: u.id,
        name: u.name,
        email: '',
        avatar: u.avatar ?? '',
        university: u.university ?? 'Global Community',
        bio: u.matchReasons?.[0] ?? 'AI-discovered profile from your current matching graph.',
        skillsOffered: offeredNames.map((skillName, idx) => ({
          id: `offered-${u.id}-${idx}`,
          name: skillName,
          icon: '',
          category: 'General',
          level: fallbackLevel,
          description: '',
        })),
        skillsWanted: wantedNames.map((skillName, idx) => ({
          id: `wanted-${u.id}-${idx}`,
          name: skillName,
          icon: '',
          category: 'General',
          level: fallbackLevel,
          description: '',
        })),
        skillexScore: u.skillexScore ?? 0,
        level: u.level ?? 'Beginner',
        sessionsCompleted: u.sessionsCompleted ?? 0,
        rating: u.rating ?? 0,
        isOnline: u.isOnline ?? false,
        joinedAt: new Date().toISOString(),
      };
    });
  }, [marketplaceUsers, users, connectedUserIds]);

  const marketplaceCategories = useMemo(() => {
    const fromUsers = marketplaceSourceUsers.flatMap((u) => [...(u.skillsOffered ?? []), ...(u.skillsWanted ?? [])]);
    return Array.from(new Set(fromUsers.map((s) => s.category).filter(Boolean))).sort();
  }, [marketplaceSourceUsers]);

  const filteredMarketplace = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    const matchesSearch = (u: User) => {
      if (!q) return true;
      const profileFields = [u.name, u.university, u.bio].filter(Boolean).join(' ').toLowerCase();
      const offeredSkills = (u.skillsOffered ?? []).map((s) => s.name.toLowerCase()).join(' ');
      const wantedSkills = (u.skillsWanted ?? []).map((s) => s.name.toLowerCase()).join(' ');
      return `${profileFields} ${offeredSkills} ${wantedSkills}`.includes(q);
    };

    const matchesCategory = (u: User) => {
      if (marketplaceCategory === 'all') return true;
      const pool = marketplaceSkillMode === 'wanted' ? (u.skillsWanted ?? []) : marketplaceSkillMode === 'offered' ? (u.skillsOffered ?? []) : [...(u.skillsOffered ?? []), ...(u.skillsWanted ?? [])];
      return pool.some((s) => s.category === marketplaceCategory);
    };

    const matchesSkillMode = (u: User) => {
      if (marketplaceSkillMode === 'all') return (u.skillsOffered?.length ?? 0) + (u.skillsWanted?.length ?? 0) > 0;
      if (marketplaceSkillMode === 'offered') return (u.skillsOffered?.length ?? 0) > 0;
      return (u.skillsWanted?.length ?? 0) > 0;
    };

    return marketplaceSourceUsers
      .filter((u) => matchesSearch(u) && matchesCategory(u) && matchesSkillMode(u) && u.rating >= filters.rating)
      .sort((a, b) => {
        switch (marketplaceSort) {
          case 'sessions':
            return (b.sessionsCompleted ?? 0) - (a.sessionsCompleted ?? 0);
          case 'score':
            return (b.skillexScore ?? 0) - (a.skillexScore ?? 0);
          case 'newest':
            return new Date(b.joinedAt ?? '').getTime() - new Date(a.joinedAt ?? '').getTime();
          case 'rating':
          default:
            return (b.rating ?? 0) - (a.rating ?? 0);
        }
      });
  }, [marketplaceSourceUsers, filters.search, filters.rating, marketplaceCategory, marketplaceSkillMode, marketplaceSort]);

  const marketplaceTotalPages = useMemo(() => Math.max(1, Math.ceil(filteredMarketplace.length / marketplacePageSize)), [filteredMarketplace.length, marketplacePageSize]);

  useEffect(() => {
    setMarketplacePage(1);
  }, [filters.search, filters.rating, marketplaceCategory, marketplaceSkillMode, marketplaceSort, marketplacePageSize]);

  useEffect(() => {
    if (marketplacePage > marketplaceTotalPages) {
      setMarketplacePage(marketplaceTotalPages);
    }
  }, [marketplacePage, marketplaceTotalPages]);

  const pagedMarketplace = useMemo(() => {
    const start = (marketplacePage - 1) * marketplacePageSize;
    return filteredMarketplace.slice(start, start + marketplacePageSize);
  }, [filteredMarketplace, marketplacePage, marketplacePageSize]);

  const marketplaceVisiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, marketplacePage - 2);
    const end = Math.min(marketplaceTotalPages, start + 4);
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    return pages;
  }, [marketplacePage, marketplaceTotalPages]);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

  return (
    <DashboardLayout>
      <div className="flex min-w-0 flex-1">
        {activeTab !== 'chain' && (
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            onApply={() => setMobileSheetOpen(false)}
            mobileSheetOpen={mobileSheetOpen}
            setMobileSheetOpen={setMobileSheetOpen}
          />
        )}
        <div className="min-w-0 flex-1 p-4 md:p-6">
          <div className={cn('mx-auto w-full', activeTab === 'chain' ? 'max-w-7xl' : 'max-w-6xl')}>
            {activeTab !== 'chain' && (
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm md:p-5"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-70" />
                <div className="relative z-10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h1 className="font-headline text-2xl font-extrabold tracking-tight md:text-3xl">Find Your <span className="text-primary">Skill Match</span></h1>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Compare real exchange fit: what you can offer, what you want next, and who can trade fairly with you.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
                        <p className="font-headline text-lg font-bold text-foreground">{filteredMatches.length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Matches</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
                        <p className="font-headline text-lg font-bold text-primary">{bestMatch?.compatibilityScore ?? 0}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Best</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
                        <p className="font-headline text-lg font-bold text-foreground">{activeFilterCount}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filters</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-4 max-w-4xl">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by skill, name, role, city, or interest..."
                      className="h-10 rounded-xl border-border/70 bg-background/70 pl-10 text-sm"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className={cn('relative', activeTab === 'chain' ? 'mt-0' : 'mt-5')}>
              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/70 p-2 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-1 overflow-x-auto">
                {[{ id: 'direct', label: 'Direct Matches' }, { id: 'chain', label: 'Skill Chains' }, { id: 'marketplace', label: 'Marketplace' }].map(tab => (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id as 'direct' | 'chain' | 'marketplace')}
                    className={cn(
                      "relative h-9 shrink-0 rounded-xl px-3 text-xs font-bold transition-colors",
                      activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && <motion.div className="absolute inset-0 -z-10 rounded-xl bg-primary" layoutId="tab-underline" />}
                  </Button>
                ))}
                </div>
                <p className="px-2 text-[11px] font-semibold text-muted-foreground">
                  {activeTab === 'direct' ? `${filteredMatches.length} direct results` : activeTab === 'chain' ? 'Multi-person exchange paths' : `${filteredMarketplace.length} marketplace profiles`}
                </p>
              </div>
            </div>

            {activeTab === 'direct' && connectedUserIds.size > 0 && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-muted-foreground">
                  Already accepted people are moved out of fresh matches. Find them in Connections, then schedule sessions from accepted exchanges on Dashboard.
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link to="/connections?tab=accepted">Current connections</Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-xl">
                    <Link to="/dashboard#active-exchanges">Schedule sessions</Link>
                  </Button>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="mt-6">
                {(activeTab !== 'marketplace' && loading) ? <LoadingSkeletons /> : (
                  <>
                    {activeTab === 'direct' ? (
                      <>
                        {bestMatch && <AIBestMatchCard match={bestMatch} currentUser={user} />}
                        <div className="my-5 flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-card/75 p-3 md:flex-row md:items-center md:justify-between">
                          <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Showing {otherMatches.length} other matches</p>
                          <div className="flex items-center gap-3">
                            <Select value={sortOption} onValueChange={setSortOption}>
                              <SelectTrigger className="w-[180px] rounded-xl h-9 text-xs">
                                <SelectValue placeholder="Sort by" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-border/70 bg-popover/95 backdrop-blur-xl">
                                <SelectItem value="best" className="text-xs">Best Match</SelectItem>
                                <SelectItem value="rating" className="text-xs">Rating</SelectItem>
                                <SelectItem value="sessions" className="text-xs">Sessions</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="rounded-xl bg-background/70 border border-border/70 p-1 flex gap-1 dark:border-white/10 dark:bg-black/30">
                              <Button aria-label="Grid view" size="sm" variant={view === 'grid' ? 'secondary' : 'ghost'} onClick={() => setView('grid')} className={cn("h-7 w-7 p-0 rounded-lg", view === 'grid' && "bg-white/10 text-white shadow-sm")}>
                                <LayoutGrid className="h-3.5 w-3.5" />
                              </Button>
                              <Button aria-label="List view" size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')} className={cn("h-7 w-7 p-0 rounded-lg", view === 'list' && "bg-white/10 text-white shadow-sm")}>
                                <List className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        {otherMatches.length === 0 && !bestMatch ? <EmptyState onReset={() => setFilters(defaultFilters)} /> : (<motion.div key={view} variants={containerVariants} initial="hidden" animate="visible" className={cn(view === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 auto-rows-min' : 'space-y-4')}>{otherMatches.map((match) => (<motion.div variants={itemVariants} key={match.id}><MatchCard match={match} /></motion.div>))}</motion.div>)}
                      </>
                    ) : activeTab === 'chain' ? (
                      <SkillChainsTabV2 />
                    ) : (
                      <>
                        <div className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/15 p-2.5"><Compass className="h-5 w-5 text-primary" /></div>
                              <div>
                                <h3 className="font-headline text-lg font-bold">Skill Marketplace</h3>
                                <p className="text-sm text-muted-foreground">Browse real members, compare what they teach, and connect faster with clear filters and rankings.</p>
                              </div>
                            </div>
                            <Button variant="outline" className="gap-2" onClick={() => void loadMarketplaceUsers()} disabled={marketplaceLoading}>
                              <RefreshCw className={cn('h-4 w-4', marketplaceLoading && 'animate-spin')} />
                              Refresh
                            </Button>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                            <Select value={marketplaceSkillMode} onValueChange={(v) => setMarketplaceSkillMode(v as MarketplaceSkillMode)}>
                              <SelectTrigger><SelectValue placeholder="Focus" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Profiles</SelectItem>
                                <SelectItem value="offered">Only Teaching</SelectItem>
                                <SelectItem value="wanted">Only Learning</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select value={marketplaceCategory} onValueChange={setMarketplaceCategory}>
                              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {marketplaceCategories.map((category) => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={marketplaceSort} onValueChange={(v) => setMarketplaceSort(v as MarketplaceSort)}>
                              <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rating">Top Rated</SelectItem>
                                <SelectItem value="sessions">Most Sessions</SelectItem>
                                <SelectItem value="score">Highest SkillEX Score</SelectItem>
                                <SelectItem value="newest">Newest Members</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select value={String(marketplacePageSize)} onValueChange={(v) => setMarketplacePageSize(Number(v))}>
                              <SelectTrigger><SelectValue placeholder="Page size" /></SelectTrigger>
                              <SelectContent>
                                {MARKETPLACE_PAGE_SIZE_OPTIONS.map((size) => (
                                  <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="rounded-xl border bg-background/70 px-3 py-2 text-sm">
                              <p className="text-xs text-muted-foreground">Results</p>
                              <p className="font-semibold">{filteredMarketplace.length} profiles</p>
                            </div>
                          </div>
                        </div>

                        {marketplaceError ? (
                          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
                            <p className="text-sm text-destructive">{marketplaceError}</p>
                            <Button className="mt-4" onClick={() => void loadMarketplaceUsers()}>Try again</Button>
                          </div>
                        ) : marketplaceLoading ? (
                          <LoadingSkeletons />
                        ) : pagedMarketplace.length === 0 ? (
                          <EmptyState onReset={() => {
                            setMarketplaceCategory('all');
                            setMarketplaceSkillMode('all');
                            setMarketplaceSort('rating');
                            setFilters(defaultFilters);
                          }} />
                        ) : (
                          <>
                            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                              {pagedMarketplace.map((profile) => (
                                <motion.div variants={itemVariants} key={profile.id}>
                                  <MarketplaceCard profile={profile} />
                                </motion.div>
                              ))}
                            </motion.div>

                            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row">
                              <p className="text-sm text-muted-foreground">
                                Page {marketplacePage} of {marketplaceTotalPages}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={marketplacePage <= 1}
                                  onClick={() => setMarketplacePage((p) => Math.max(1, p - 1))}
                                >
                                  <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                                </Button>
                                {marketplaceVisiblePages[0] > 1 && (
                                  <>
                                    <Button variant={marketplacePage === 1 ? 'default' : 'outline'} size="sm" onClick={() => setMarketplacePage(1)}>1</Button>
                                    {marketplaceVisiblePages[0] > 2 && <span className="px-1 text-muted-foreground">...</span>}
                                  </>
                                )}
                                {marketplaceVisiblePages.map((pageNum) => (
                                  <Button
                                    key={pageNum}
                                    variant={marketplacePage === pageNum ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setMarketplacePage(pageNum)}
                                  >
                                    {pageNum}
                                  </Button>
                                ))}
                                {marketplaceVisiblePages[marketplaceVisiblePages.length - 1] < marketplaceTotalPages && (
                                  <>
                                    {marketplaceVisiblePages[marketplaceVisiblePages.length - 1] < marketplaceTotalPages - 1 && <span className="px-1 text-muted-foreground">...</span>}
                                    <Button variant={marketplacePage === marketplaceTotalPages ? 'default' : 'outline'} size="sm" onClick={() => setMarketplacePage(marketplaceTotalPages)}>{marketplaceTotalPages}</Button>
                                  </>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={marketplacePage >= marketplaceTotalPages}
                                  onClick={() => setMarketplacePage((p) => Math.min(marketplaceTotalPages, p + 1))}
                                >
                                  Next <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
