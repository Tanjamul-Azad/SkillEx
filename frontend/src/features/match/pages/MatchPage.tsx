import React, { useState, useMemo, FC, useCallback, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMatchUsers } from '@/hooks/useMatchUsers';
import {
  LayoutGrid,
  List,
  Search,
  RefreshCw,
  ServerCrash,
  ChevronLeft,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  FilterSidebar,
  defaultFilters,
  type Filters,
} from '@/features/match/components/FilterSidebar';
import { AIBestMatchCard } from '@/features/match/components/AIBestMatchCard';
import { MatchCard } from '@/features/match/components/MatchCard';
import { SkillChainsTab } from '@/features/match/components/SkillChainsTab';
import { MarketplaceCard } from '@/features/match/components/MarketplaceCard';
import { connectionService } from '@/services/connectionService';
import { exchangeService } from '@/services/exchangeService';
import { UserService } from '@/services/userService';

const LoadingSkeletons = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[290px] rounded-2xl" />)}
  </div>
);

const EmptyState: FC<{ onReset: () => void, isChain?: boolean }> = ({ onReset, isChain }) => (
  <div className="flex w-full flex-col items-center justify-center rounded-3xl border border-border/70 bg-card px-6 py-14 text-center shadow-sm">
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
                className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm md:p-5"
              >
                <div className="relative z-10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h1 className="font-headline text-2xl font-extrabold tracking-tight md:text-3xl">
                        Find Your <span className="text-primary">Skill Match</span>
                      </h1>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Compare real exchange fit: what you can offer, what you want next, and who can trade fairly with you.
                      </p>
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
              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-2 md:flex-row md:items-center md:justify-between">
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
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-6"
              >
                {(activeTab !== 'marketplace' && loading) ? <LoadingSkeletons /> : (
                  <>
                    {activeTab === 'direct' ? (
                      <>
                        {bestMatch && <AIBestMatchCard match={bestMatch} currentUser={user} />}
                        <div className="my-5 flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-card p-3 md:flex-row md:items-center md:justify-between">
                          <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Showing {otherMatches.length} other matches
                          </p>
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
                        {otherMatches.length === 0 && !bestMatch ? (
                          <EmptyState onReset={() => setFilters(defaultFilters)} />
                        ) : (
                          <motion.div key={view} variants={containerVariants} initial="hidden" animate="visible" className={cn(view === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 auto-rows-min' : 'space-y-4')}>
                            {otherMatches.map((match) => (
                              <motion.div variants={itemVariants} key={match.id}>
                                <MatchCard match={match} />
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </>
                    ) : activeTab === 'chain' ? (
                      <SkillChainsTab />
                    ) : (
                      <>
                        <div className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/15 p-2.5">
                                <Compass className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-headline text-lg font-bold">Skill Marketplace</h3>
                                <p className="text-sm text-muted-foreground">
                                  Browse real members, compare what they teach, and connect faster with clear filters and rankings.
                                </p>
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
