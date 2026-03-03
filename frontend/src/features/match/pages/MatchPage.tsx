
import React, { useState, useMemo, FC, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMatchUsers, type MatchUser } from '@/hooks/useMatchUsers';
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

const FilterSidebar: FC<{ filters: Filters; setFilters: (f: Filters) => void }> = React.memo(({ filters, setFilters }) => {
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
        <Button className="w-full font-bold gradient-bg text-primary-foreground shadow-glow">
          Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-[calc(100vh-4rem)] w-72 flex-col border-r lg:flex sticky top-16">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-headline text-lg font-bold">Filters</h2>
          <Button
            variant="link"
            className="p-0 text-sm"
            onClick={() => setFilters(defaultFilters)}
          >
            Reset All
          </Button>
        </div>
        {content}
      </aside>
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed bottom-24 right-4 z-40 rounded-full shadow-lg" aria-label="Open filters">
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
        className="relative mb-8 rounded-2xl glass-strong p-6 shadow-glow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Badge className="absolute -top-3 left-4 gap-2 border-amber-400 bg-amber-300 text-amber-900 shadow-md">
          <Sparkles className="h-4 w-4" /> AI Best Match
        </Badge>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center justify-center md:col-span-1">
            <div className="flex -space-x-6">
              <Avatar className="h-20 w-20 border-4 border-background"><AvatarImage src={currentUser?.avatar} /><AvatarFallback>{myName.charAt(0)}</AvatarFallback></Avatar>
              <Avatar className="h-20 w-20 border-4 border-background"><AvatarImage src={match.avatar} /><AvatarFallback>{match.name.charAt(0)}</AvatarFallback></Avatar>
            </div>
            <p className="mt-2 text-center font-semibold">{myName} & {match.name}</p>
            <MatchScoreRing score={score} size={96} strokeWidth={6} className="mt-2" />
          </div>
          <div className="space-y-4 md:col-span-2">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground">Compatibility Breakdown</h4>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2"><div className="w-28 text-xs">Skill Alignment</div><Progress value={Math.min(100, score + 5)} className="h-2 flex-1" /><span className="text-xs font-medium">{Math.min(100, score + 5)}%</span></div>
                <div className="flex items-center gap-2"><div className="w-28 text-xs">Profile Match</div><Progress value={Math.min(100, score - 3)} className="h-2 flex-1" /><span className="text-xs font-medium">{Math.min(100, score - 3)}%</span></div>
                <div className="flex items-center gap-2"><div className="w-28 text-xs">Rating</div><Progress value={Math.round((match.rating / 5) * 100)} className="h-2 flex-1" /><span className="text-xs font-medium">{match.rating.toFixed(1)}</span></div>
              </div>
            </div>
            <div className="flex gap-4">
              {match.iOffer && <div className="flex-1 rounded-md border p-2 text-sm"><p className="font-bold">{myName.split(' ')[0]} teaches:</p><p>{match.iOffer.name}</p></div>}
              {match.theyOffer && <div className="flex-1 rounded-md border p-2 text-sm"><p className="font-bold">{match.name.split(' ')[0]} teaches:</p><p>{match.theyOffer.name}</p></div>}
            </div>
            <div className="flex gap-2">
              <Button className="w-full font-bold gradient-bg text-primary-foreground shadow-glow" onClick={() => setRequestOpen(true)}>Request Exchange</Button>
              <Button variant="outline" className="w-full glass-subtle text-foreground hover:bg-white/10" asChild><Link to={`/profile/${match.id}`}>View Profile</Link></Button>
            </div>
          </div>
        </div>
      </motion.div>
      <RequestExchangeDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        targetUser={match as User}
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
              <AvatarImage src={match.avatar} />
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
            {match.theyOffer && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-1.5">
                <span className="font-semibold text-xs text-primary/80">Teaches</span>
                <span className="font-bold text-xs">{match.theyOffer.name}</span>
                <Badge variant="secondary" className="ml-auto capitalize text-xs">{match.theyOffer.level}</Badge>
              </div>
            )}
            {match.iOffer && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                <span className="font-semibold text-xs text-muted-foreground">Wants</span>
                <span className="font-medium text-xs">{match.iOffer.name}</span>
              </div>
            )}
            {!match.theyOffer && !match.iOffer && match.skillsOffered[0] && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-1.5">
                <span className="font-semibold text-xs text-primary/80">Offers</span>
                <span className="font-bold text-xs">{match.skillsOffered[0].name}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Star className="h-3 w-3 text-accent fill-accent" /> {match.rating.toFixed(1)}</div>
            <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {match.sessionsCompleted} sessions</div>
            <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> {match.skillexScore}</div>
          </div>
        </CardContent>
        <div className="flex border-t border-white/10 dark:border-white/5">
          <Button variant="ghost" className="w-1/2 rounded-none rounded-bl-2xl text-sm hover:bg-primary/10 transition-colors" asChild>
            <Link to={`/profile/${match.id}`}>View Profile</Link>
          </Button>
          <Button
            onClick={() => setRequestOpen(true)}
            className="w-1/2 rounded-none rounded-br-2xl gradient-bg text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Request
          </Button>
        </div>
      </Card>
      <RequestExchangeDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        targetUser={match as User}
      />
    </>
  );
});
MatchCard.displayName = 'MatchCard';

const ChainComingSoon = () => (
  <div className="flex w-full flex-col items-center justify-center rounded-3xl glass-subtle py-20 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
    <div className="p-5 bg-primary/10 rounded-full shadow-glow-sm"><Link2 className="h-12 w-12 text-primary" /></div>
    <h2 className="mt-6 text-2xl font-bold font-headline">Skill Chains Coming Soon</h2>
    <p className="mt-2 max-w-sm text-muted-foreground">Multi-person skill exchange chains are under development. Check back soon!</p>
  </div>
);

const LoadingSkeletons = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
    {[...Array(6)].map((_, i) => <Skeleton key={i} variant="card" />)}
  </div>
);

const EmptyState: FC<{ onReset: () => void, isChain?: boolean }> = ({ onReset, isChain }) => (
  <div className="flex w-full flex-col items-center justify-center rounded-3xl glass-subtle py-20 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"><div className="p-5 bg-primary/10 rounded-full shadow-glow-sm"><ServerCrash className="h-12 w-12 text-primary" /></div><h2 className="mt-6 text-2xl font-bold font-headline">{isChain ? 'No Chains Found' : 'No Matches Found'}</h2><p className="mt-2 max-w-sm text-muted-foreground">{isChain ? 'There are no multi-person skill chains available for you right now.' : 'Try adjusting your filters to find more skill exchange opportunities.'}</p><Button onClick={onReset} className="mt-6 gap-2 glass-strong"><RefreshCw className="h-4 w-4" /> Reset Filters</Button></div>
);

export default function MatchPage() {
  const { user } = useAuth();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'direct' | 'chain'>('direct');
  const [sortOption, setSortOption] = useState('best');
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const { users, loading } = useMatchUsers({ search: filters.search, limit: 50 });

  const filteredMatches = useMemo(() => {
    return users.filter((u) => {
      const matchesCategory = filters.categories.length === 0
        || u.skillsOffered.some(s => filters.categories.includes(s.category))
        || u.skillsWanted.some(s => filters.categories.includes(s.category));
      const matchesLevel = filters.levels.length === 0
        || u.skillsOffered.some(s => filters.levels.includes(s.level))
        || u.skillsWanted.some(s => filters.levels.includes(s.level));
      const matchesCompatibility = u.compatibilityScore >= filters.compatibility[0];
      const matchesRating = u.rating >= filters.rating;
      return matchesCategory && matchesLevel && matchesCompatibility && matchesRating;
    }).sort((a, b) => {
      switch (sortOption) {
        case 'rating': return b.rating - a.rating;
        case 'sessions': return b.sessionsCompleted - a.sessionsCompleted;
        case 'newest': return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        default: return b.compatibilityScore - a.compatibilityScore;
      }
    });
  }, [users, filters, sortOption]);

  const bestMatch = useMemo(() => (activeTab === 'direct' && filteredMatches.length > 0) ? filteredMatches[0] : null, [filteredMatches, activeTab]);
  const otherMatches = useMemo(() => (activeTab === 'direct' && filteredMatches.length > 0) ? filteredMatches.slice(1) : [], [filteredMatches, activeTab]);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

  return (
    <DashboardLayout>
      <div className="flex flex-1">
        <FilterSidebar filters={filters} setFilters={setFilters} />
        <div className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight">Find Your <span className="text-gradient-animated">Skill Match</span></h1>
              <p className="mt-2 text-muted-foreground">AI-powered recommendations based on your unique skill profile.</p>
              <div className="relative mt-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search by skill, name, or university..." className="pl-10 text-base" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
            </motion.div>

            <div className="relative mt-6">
              <div className="border-b"><div className="flex space-x-2">
                {[{ id: 'direct', label: 'Direct Matches' }, { id: 'chain', label: 'Skill Chains' }].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("relative py-2 px-3 font-medium transition-colors", activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                    {tab.label}
                    {activeTab === tab.id && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" layoutId="tab-underline" />}
                  </button>
                ))}
              </div></div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="mt-6">
                {loading ? <LoadingSkeletons /> : (
                  <>
                    {activeTab === 'direct' ? (
                      <>
                        {bestMatch && <AIBestMatchCard match={bestMatch} currentUser={user} />}
                        <div className="my-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between"><p className="font-semibold text-muted-foreground">Showing {otherMatches.length} other matches</p><div className="flex items-center gap-2"><Select value={sortOption} onValueChange={setSortOption}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="best">Best Match</SelectItem><SelectItem value="rating">Rating</SelectItem><SelectItem value="sessions">Sessions</SelectItem><SelectItem value="newest">Newest</SelectItem></SelectContent></Select><div className="rounded-md bg-muted p-1"><Button aria-label="Grid view" size="sm" variant={view === 'grid' ? 'default' : 'ghost'} onClick={() => setView('grid')}><LayoutGrid /></Button><Button aria-label="List view" size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')}><List /></Button></div></div></div>
                        {otherMatches.length === 0 && !bestMatch ? <EmptyState onReset={() => setFilters(defaultFilters)} /> : (<motion.div key={view} variants={containerVariants} initial="hidden" animate="visible" className={cn(view === 'grid' ? 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3' : 'space-y-4')}>{otherMatches.map((match) => (<motion.div variants={itemVariants} key={match.id}><MatchCard match={match} /></motion.div>))}</motion.div>)}
                      </>
                    ) : (
                      <ChainComingSoon />
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
