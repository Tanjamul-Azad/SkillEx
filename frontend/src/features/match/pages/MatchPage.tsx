
import React, { useState, useMemo, FC, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMatchUsers, type MatchUser } from '@/hooks/useMatchUsers';
import { useTopCycles } from '@/hooks/useTopCycles';
import { CompatibilityMeter } from '@/features/match/components/CompatibilityMeter';
import { SkillGraphCard } from '@/features/match/components/SkillGraphCard';
import { ExchangeChainCard, type ExchangeCycleData } from '@/features/match/components/ExchangeChainCard';
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
  Link2,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  GitMerge,
  RotateCcw,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
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
}> = React.memo(({ filters, setFilters, onApply, mobileSheetOpen, setMobileSheetOpen }) => {
  const activeFilterCount =
    filters.categories.length +
    filters.levels.length +
    (filters.sessionType !== 'Both' ? 1 : 0) +
    (filters.compatibility[0] > 50 ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex-grow space-y-4 overflow-y-auto p-4">
        <Accordion type="multiple" defaultValue={['category', 'level', 'compatibility']} className="w-full">
          <AccordionItem value="category">
            <AccordionTrigger>Category</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.id}
                    checked={filters.categories.includes(category.id)}
                    onCheckedChange={(checked) => {
                      setFilters({
                        ...filters,
                        categories: checked
                          ? [...filters.categories, category.id]
                          : filters.categories.filter((c) => c !== category.id),
                      });
                    }}
                  />
                  <label htmlFor={category.id} className="text-sm font-medium leading-none">
                    {category.name}
                  </label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="level">
            <AccordionTrigger>Level</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {['beginner', 'moderate', 'expert'].map((level) => (
                  <Button
                    key={level}
                    variant={filters.levels.includes(level) ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                    onClick={() => {
                      setFilters({
                        ...filters,
                        levels: filters.levels.includes(level)
                          ? filters.levels.filter((l) => l !== level)
                          : [...filters.levels, level],
                      });
                    }}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sessionType">
            <AccordionTrigger>Session Type</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {['Online', 'In-person', 'Both'].map((type) => (
                  <Button
                    key={type}
                    variant={filters.sessionType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters({ ...filters, sessionType: type })}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="compatibility">
            <AccordionTrigger>Min Compatibility</AccordionTrigger>
            <AccordionContent className="pt-4">
              <Slider
                value={filters.compatibility}
                onValueChange={(value) => setFilters({ ...filters, compatibility: value })}
                max={100}
                min={50}
                step={1}
              />
              <div className="mt-2 text-center text-sm font-medium">
                {filters.compatibility[0]}%
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="rating">
            <AccordionTrigger>Minimum Rating</AccordionTrigger>
            <AccordionContent>
              <div className="flex justify-around">
                {[3, 4, 4.5].map((r) => (
                  <Button
                    key={r}
                    variant={filters.rating === r ? 'default' : 'ghost'}
                    onClick={() => setFilters({ ...filters, rating: filters.rating === r ? 0 : r })}
                  >
                    <div className="flex items-center">
                      {r} <Star className="ml-1 h-4 w-4 fill-yellow-400 text-yellow-400" />+
                    </div>
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="border-t border-white/10 dark:border-white/5 p-4">
        <Button variant="gradient" className="w-full" onClick={onApply}>
          Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </div>
    </div>
  );
  return (
    <>
      <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-background/50 md:block">
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
          <SheetContent side="left" className="w-full max-w-sm p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="flex items-center justify-between">
                Filters
                <Button variant="link" className="p-0" onClick={() => setFilters(defaultFilters)}>
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
  const myName = currentUser?.name ?? 'You';
  const score = match.compatibilityScore;
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            AI Best Match
          </Badge>
          <CompatibilityMeter score={score} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                <AvatarImage src={match.avatar ?? undefined} />
                <AvatarFallback>{match.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-headline text-lg font-bold">{match.name}</h3>
                <p className="text-sm text-muted-foreground">{match.university}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {typeof match.rating === 'number' ? match.rating.toFixed(1) : '0.0'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {match.sessionsCompleted} sessions
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground">Compatibility Breakdown</h4>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2"><div className="w-28 text-xs">Skill Similarity</div><Progress value={match.semanticSimilarity} className="h-2 flex-1" /><span className="text-xs font-medium">{match.semanticSimilarity}%</span></div>
                <div className="flex items-center gap-2"><div className="w-28 text-xs">Overall Match</div><Progress value={score} className="h-2 flex-1" /><span className="text-xs font-medium">{score}%</span></div>
                <div className="flex items-center gap-2"><div className="w-28 text-xs">Rating</div><Progress value={Math.round((match.rating / 5) * 100)} className="h-2 flex-1" /><span className="text-xs font-medium">{match.rating.toFixed(1)}</span></div>
              </div>
            </div>
            {match.matchReasons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">Why this match</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {match.matchReasons.slice(0, 4).map((reason: string) => (
                    <Badge key={reason} variant="secondary" className="max-w-full whitespace-normal px-3 py-1 text-xs leading-relaxed">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <SkillGraphCard
              offeredSkills={match.wantsToLearnFromYou ?? []}
              wantedSkills={match.teachesYou ?? []}
              userName={myName.split(' ')[0]}
            />
            <div className="flex gap-2">
              <Button variant="gradient" className="w-full" onClick={() => setRequestOpen(true)}>Request Exchange</Button>
              <Button variant="outline" className="w-full glass-subtle text-foreground hover:bg-white/10" asChild><Link to={`/profile/${match.id}`}>View Profile</Link></Button>
            </div>
          </div>
        </div>
      </motion.div>
      <RequestExchangeDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        targetUser={match as unknown as User}
      />
    </>
  );
});
AIBestMatchCard.displayName = 'AIBestMatchCard';

const MatchCard: FC<{ match: MatchUser }> = React.memo(({ match }) => {
  const [requestOpen, setRequestOpen] = useState(false);
  return (
    <>
      <Card className="group h-full overflow-hidden transition-all duration-400 ease-snappy hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25),0_4px_12px_hsl(220_20%_40%/0.1)]">
        {/* Animated sheen line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="relative p-5">
          <div className="absolute top-5 right-4"><MatchScoreRing score={match.compatibilityScore} size={48} /></div>
          <div className="flex items-center gap-3 pr-14">
            <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-primary/30 transition-all">
              <AvatarImage src={match.avatar ?? undefined} />
              <AvatarFallback>{match.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-headline text-base font-bold">{match.name}</h3>
              <p className="text-sm text-muted-foreground">{match.university}</p>
              {match.isOnline && (
                <span className="flex items-center gap-1 text-xs font-medium text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary inline-block" />
                  Online
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {match.teachesYou?.[0] && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-1.5">
                <span className="font-semibold text-xs text-primary/80">Teaches</span>
                <span className="font-bold text-xs">{match.teachesYou[0]}</span>
              </div>
            )}
            {match.wantsToLearnFromYou?.[0] && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                <span className="font-semibold text-xs text-muted-foreground">Wants</span>
                <span className="font-medium text-xs">{match.wantsToLearnFromYou[0]}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Star className="h-3 w-3 text-accent fill-accent" /> {typeof match.rating === 'number' ? match.rating.toFixed(1) : '–'}</div>
            <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {match.sessionsCompleted} sessions</div>
            <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> {match.skillexScore}</div>
            <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> {match.semanticSimilarity}% similarity</div>
          </div>
          {match.matchReasons?.[0] && (
            <div className="mt-3 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              {match.matchReasons[0]}
            </div>
          )}
        </CardContent>
        <div className="flex border-t border-white/10 dark:border-white/5">
          <Button variant="ghost" className="w-1/2 rounded-none rounded-bl-2xl text-sm hover:bg-primary/10 transition-colors" asChild>
            <Link to={`/profile/${match.id}`}>View Profile</Link>
          </Button>
          <Button
            onClick={() => setRequestOpen(true)}
            variant="gradient"
            className="w-1/2 rounded-none rounded-br-2xl text-sm"
          >
            Request
          </Button>
        </div>
      </Card>
      <RequestExchangeDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        targetUser={match as unknown as User}
      />
    </>
  );
});
MatchCard.displayName = 'MatchCard';

type ChainParticipant = { id: string; name: string; avatar: string; teaches: string; category: string };
type SkillChain = { id: string; participants: ChainParticipant[]; totalSkills: number; openSpots: number; joined: boolean };

const MOCK_CHAINS: SkillChain[] = [
  {
    id: 'chain-1',
    participants: [
      { id: 'p1', name: 'Aisha K.', avatar: 'https://i.pravatar.cc/150?img=47', teaches: 'Python', category: 'Tech' },
      { id: 'p2', name: 'Marcus L.', avatar: 'https://i.pravatar.cc/150?img=12', teaches: 'UI Design', category: 'Design' },
      { id: 'p3', name: 'Sofia R.', avatar: 'https://i.pravatar.cc/150?img=25', teaches: 'Spanish', category: 'Language' },
    ],
    totalSkills: 3,
    openSpots: 1,
    joined: false,
  },
  {
    id: 'chain-2',
    participants: [
      { id: 'p4', name: 'Jin W.', avatar: 'https://i.pravatar.cc/150?img=33', teaches: 'Guitar', category: 'Creative' },
      { id: 'p5', name: 'Priya M.', avatar: 'https://i.pravatar.cc/150?img=44', teaches: 'Data Science', category: 'Tech' },
      { id: 'p6', name: 'Leo T.', avatar: 'https://i.pravatar.cc/150?img=60', teaches: 'Photography', category: 'Creative' },
      { id: 'p7', name: 'Nadia B.', avatar: 'https://i.pravatar.cc/150?img=9', teaches: 'French', category: 'Language' },
    ],
    totalSkills: 4,
    openSpots: 0,
    joined: false,
  },
  {
    id: 'chain-3',
    participants: [
      { id: 'p8', name: 'Carlos V.', avatar: 'https://i.pravatar.cc/150?img=15', teaches: 'React', category: 'Tech' },
      { id: 'p9', name: 'Emma S.', avatar: 'https://i.pravatar.cc/150?img=38', teaches: 'Business Strategy', category: 'Business' },
      { id: 'p10', name: 'Omar F.', avatar: 'https://i.pravatar.cc/150?img=52', teaches: 'Public Speaking', category: 'Communication' },
    ],
    totalSkills: 3,
    openSpots: 2,
    joined: false,
  },
];

const categoryColorMap: Record<string, string> = {
  Tech: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Design: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Language: 'bg-green-500/15 text-green-400 border-green-500/30',
  Creative: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Business: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Communication: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
};

const SkillChainCard: FC<{ chain: SkillChain }> = React.memo(({ chain }) => {
  const [joined, setJoined] = useState(chain.joined);
  const full = chain.openSpots === 0;
  return (
    <motion.div
      layout
      className="rounded-2xl glass-subtle border border-white/10 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:border-primary/30 transition-colors duration-300"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Participants row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {chain.participants.map((p, idx) => (
          <React.Fragment key={p.id}>
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <Avatar className="h-12 w-12 ring-2 ring-border">
                <AvatarImage src={p.avatar} />
                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-xs font-semibold text-center leading-tight max-w-[72px] truncate">{p.name}</p>
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', categoryColorMap[p.category] ?? 'bg-muted text-muted-foreground border-border')}>
                {p.teaches}
              </span>
            </div>
            {idx < chain.participants.length - 1 && (
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mx-0.5" />
            )}
          </React.Fragment>
        ))}
        {chain.openSpots > 0 && (
          <>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mx-0.5" />
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <div className="h-12 w-12 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center bg-primary/5">
                <span className="text-lg text-primary/60">+</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">{chain.openSpots} open</p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> {chain.totalSkills} skills</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {chain.participants.length} members</span>
        </div>
        {joined ? (
          <Button size="sm" variant="outline" disabled className="gap-1.5 text-secondary border-secondary/40 bg-secondary/10">
            <CheckCircle2 className="h-4 w-4" /> Joined
          </Button>
        ) : full ? (
          <Button size="sm" variant="outline" disabled className="text-muted-foreground">Chain Full</Button>
        ) : (
          <Button size="sm" variant="gradient" onClick={() => setJoined(true)}>Join Chain</Button>
        )}
      </div>
    </motion.div>
  );
});
SkillChainCard.displayName = 'SkillChainCard';

const SkillChainsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cycles, loading, refetch } = useTopCycles({ limit: 20 });
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinTargetUser, setJoinTargetUser] = useState<User | null>(null);

  const perfectSwaps   = cycles.filter(c => c.cycle.hops.length === 2);
  const multiChains    = cycles.filter(c => c.cycle.hops.length >  2);
  const totalParticipants = new Set(cycles.flatMap(c => c.cycle.userIds)).size;
  const myChainCount   = cycles.filter(c => user?.id && c.cycle.userIds.includes(user.id)).length;

  const openJoinDialog = useCallback((cycle: ExchangeCycleData, explicitTargetId?: string) => {
    if (!user) return;

    const targetId = explicitTargetId ?? cycle.userIds.find((id) => id !== user.id);
    if (!targetId) return;

    const targetIdx = cycle.userIds.findIndex((id) => id === targetId);
    const targetName = targetIdx >= 0 ? (cycle.userNames[targetIdx] ?? 'Chain Member') : 'Chain Member';
    const offeredSkill = cycle.hops.find((hop) => hop.fromUserId === targetId)?.primarySkillName ?? 'Skill Exchange';

    setJoinTargetUser({
      id: targetId,
      name: targetName,
      email: `${targetId}@chain.local`,
      avatar: '',
      university: 'Chain Match',
      bio: 'Matched from exchange chain',
      skillsOffered: [{
        id: `chain-skill-${targetId}`,
        name: offeredSkill,
        icon: 'Sparkles',
        category: 'General',
        description: `${offeredSkill} exchange opportunity`,
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
  }, [user]);

  const startChain = useCallback((cycle: ExchangeCycleData) => {
    if (!user) return;

    const incomingHop = cycle.hops.find((hop) => hop.toUserId === user.id);
    if (!incomingHop) {
      toast({
        variant: 'destructive',
        title: 'Cannot start this chain',
        description: 'Your role in this chain could not be resolved.',
      });
      return;
    }

    openJoinDialog(cycle, incomingHop.fromUserId);
    toast({
      title: 'Chain kickoff ready',
      description: `Targeted request prepared for ${incomingHop.fromUserName}. Review and send from the dialog.`,
      variant: 'success',
    });
  }, [openJoinDialog, toast, user]);

  return (
    <div className="space-y-5">
      {/* ── How It Works explainer ── */}
      <div className="rounded-xl glass-subtle border border-white/10 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-full shrink-0 mt-0.5">
            <GitMerge className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Barter Exchange Detection — How It Works</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              SkiilEX's AI builds a directed graph of all users and their offered/wanted skills, then
              runs a three-colour DFS cycle-detection algorithm to find exchange rings automatically.
              No money changes hands — every member teaches what they know and learns what they need.
            </p>
          </div>
        </div>
        {/* Mini cycle diagram */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground overflow-x-auto py-1">
          {[
            { user: 'A', offers: 'Python', wants: 'UI' },
            { user: 'B', offers: 'UI', wants: 'Marketing' },
            { user: 'C', offers: 'Marketing', wants: 'Python' },
          ].map((n, idx, arr) => (
            <React.Fragment key={n.user}>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-center min-w-[80px]">
                  <div className="font-bold text-foreground">User {n.user}</div>
                  <div className="text-[9px] text-primary/80">offers {n.offers}</div>
                  <div className="text-[9px] text-muted-foreground">wants {n.wants}</div>
                </div>
              </div>
              {idx < arr.length - 1 && (
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <ArrowRight className="h-3.5 w-3.5 text-primary/50" />
                  <span className="text-[9px] text-primary/70">{arr[idx].offers}→{n.user}</span>
                </div>
              )}
            </React.Fragment>
          ))}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <RotateCcw className="h-3.5 w-3.5 text-primary/50" />
            <span className="text-[9px] text-primary/70">Marketing→A</span>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {!loading && cycles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Network className="h-4 w-4 text-primary" />, label: 'Total Chains', value: cycles.length },
            { icon: <ArrowLeftRight className="h-4 w-4 text-emerald-400" />, label: 'Perfect Swaps', value: perfectSwaps.length },
            { icon: <Users className="h-4 w-4 text-purple-400" />, label: 'Participants', value: totalParticipants },
            { icon: <CheckCircle2 className="h-4 w-4 text-amber-400" />, label: 'Your Chains', value: myChainCount },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl glass-subtle border border-white/10 px-4 py-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.04] shrink-0">{stat.icon}</div>
              <div>
                <div className="text-xl font-bold tabular-nums">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="card" />)}
        </div>
      ) : cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl glass-subtle py-20 text-center border border-white/10">
          <div className="p-4 bg-muted/20 rounded-full">
            <GitMerge className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <p className="mt-4 text-base font-semibold">No exchange chains detected yet</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Add offered and wanted skills to your profile. The algorithm automatically detects
            2-way swaps and multi-person rings system-wide.
          </p>
          <Button variant="outline" size="sm" className="mt-5 gap-2" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry Detection
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2-Way Perfect Swaps */}
          {perfectSwaps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold">Perfect 2-Way Swaps</h3>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                  {perfectSwaps.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {perfectSwaps.map((chain, i) => (
                  <ExchangeChainCard
                    key={`swap-${i}`}
                    data={chain}
                    currentUserId={user?.id}
                    onRequestJoin={openJoinDialog}
                    onStartChain={startChain}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Multi-person chains */}
          {multiChains.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Multi-Person Chains</h3>
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                  {multiChains.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {multiChains.map((chain, i) => (
                  <ExchangeChainCard
                    key={`chain-${i}`}
                    data={chain}
                    currentUserId={user?.id}
                    onRequestJoin={openJoinDialog}
                    onStartChain={startChain}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

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
  <div className="flex w-full flex-col items-center justify-center rounded-3xl glass-subtle py-20 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"><div className="p-5 bg-primary/10 rounded-full shadow-glow-sm"><ServerCrash className="h-12 w-12 text-primary" /></div><h2 className="mt-6 text-2xl font-bold font-headline">{isChain ? 'No Chains Found' : 'No Matches Found'}</h2><p className="mt-2 max-w-sm text-muted-foreground">{isChain ? 'There are no multi-person skill chains available for you right now.' : 'Try adjusting your filters to find more skill exchange opportunities.'}</p><Button onClick={onReset} className="mt-6 gap-2 glass-strong"><RefreshCw className="h-4 w-4" /> Reset Filters</Button></div>
);

type MarketplaceSort = 'rating' | 'sessions' | 'score' | 'newest';
type MarketplaceSkillMode = 'all' | 'offered' | 'wanted';

const MARKETPLACE_PAGE_SIZE = 16;
const MARKETPLACE_PAGE_SIZE_OPTIONS = [16, 24, 36, 48] as const;

export default function MatchPage() {
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

  const { users, loading } = useMatchUsers({ search: filters.search, limit: 50 });

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
      setMarketplaceUsers(uniqueUsers.filter((u) => u.id !== user?.id));
    } catch {
      setMarketplaceError('Could not load the marketplace right now. Please try again.');
    } finally {
      setMarketplaceLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'marketplace' && marketplaceUsers.length === 0 && !marketplaceLoading && !marketplaceError) {
      void loadMarketplaceUsers();
    }
  }, [activeTab, marketplaceUsers.length, marketplaceLoading, marketplaceError, loadMarketplaceUsers]);

  const filteredMatches = useMemo(() => {
    return users.filter((u) => {
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
  }, [users, filters, sortOption]);

  const bestMatch = useMemo(() => (activeTab === 'direct' && filteredMatches.length > 0) ? filteredMatches[0] : null, [filteredMatches, activeTab]);
  const otherMatches = useMemo(() => (activeTab === 'direct' && filteredMatches.length > 0) ? filteredMatches.slice(1) : [], [filteredMatches, activeTab]);

  const marketplaceSourceUsers = useMemo<User[]>(() => {
    const hasDirectorySkills = marketplaceUsers.some(
      (u) => (u.skillsOffered?.length ?? 0) > 0 || (u.skillsWanted?.length ?? 0) > 0
    );

    if (marketplaceUsers.length > 0 && hasDirectorySkills) {
      return marketplaceUsers;
    }

    return users.map((u) => {
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
  }, [marketplaceUsers, users]);

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
      <div className="flex flex-1">
        <FilterSidebar
          filters={filters}
          setFilters={setFilters}
          onApply={() => setMobileSheetOpen(false)}
          mobileSheetOpen={mobileSheetOpen}
          setMobileSheetOpen={setMobileSheetOpen}
        />
        <div className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight">Find Your <span className="text-gradient-animated">Skill Match</span></h1>
              <p className="mt-2 text-muted-foreground">AI-powered recommendations based on your unique skill profile.</p>
              <div className="relative mt-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search by skill, name, or university..." className="pl-10 text-base" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
            </motion.div>

            <div className="relative mt-6">
              <div className="border-b"><div className="flex space-x-2">
                {[{ id: 'direct', label: 'Direct Matches' }, { id: 'chain', label: 'Skill Chains' }, { id: 'marketplace', label: 'Marketplace' }].map(tab => (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id as 'direct' | 'chain' | 'marketplace')}
                    className={cn(
                      "relative py-2 px-3 font-medium transition-colors hover:bg-transparent",
                      activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" layoutId="tab-underline" />}
                  </Button>
                ))}
              </div></div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="mt-6">
                {(activeTab !== 'marketplace' && loading) ? <LoadingSkeletons /> : (
                  <>
                    {activeTab === 'direct' ? (
                      <>
                        {bestMatch && <AIBestMatchCard match={bestMatch} currentUser={user} />}
                        <div className="my-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between"><p className="font-semibold text-muted-foreground">Showing {otherMatches.length} other matches</p><div className="flex items-center gap-2"><Select value={sortOption} onValueChange={setSortOption}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="best">Best Match</SelectItem><SelectItem value="rating">Rating</SelectItem><SelectItem value="sessions">Sessions</SelectItem></SelectContent></Select><div className="rounded-md bg-muted p-1"><Button aria-label="Grid view" size="sm" variant={view === 'grid' ? 'default' : 'ghost'} onClick={() => setView('grid')}><LayoutGrid /></Button><Button aria-label="List view" size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')}><List /></Button></div></div></div>
                        {otherMatches.length === 0 && !bestMatch ? <EmptyState onReset={() => setFilters(defaultFilters)} /> : (<motion.div key={view} variants={containerVariants} initial="hidden" animate="visible" className={cn(view === 'grid' ? 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3' : 'space-y-4')}>{otherMatches.map((match) => (<motion.div variants={itemVariants} key={match.id}><MatchCard match={match} /></motion.div>))}</motion.div>)}
                      </>
                    ) : activeTab === 'chain' ? (
                      <SkillChainsTab />
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
