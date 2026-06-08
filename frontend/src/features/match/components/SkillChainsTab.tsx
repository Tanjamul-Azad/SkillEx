import React, { useState, useMemo, FC, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeftRight,
  RotateCcw,
  Network,
  Clock3,
  Eye,
  ShieldCheck,
  Users,
  ServerCrash,
  GitMerge,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTopCycles } from '@/hooks/useTopCycles';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import type { ExchangeCycleData, ScoredCycleDto } from '@/features/match/components/ExchangeChainCard';
import { RequestExchangeDialog } from '@/features/match/components/RequestExchangeDialog';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ChainFilter = 'all' | 'mine' | 'swap' | 'multi';

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
    <div className={cn('flex min-w-0 items-center gap-2 pb-1', compact ? 'overflow-x-auto' : 'overflow-hidden')}>
      {cycle.hops.map((hop, index) => {
        const isCurrent = hop.fromUserId === currentUserId;
        return (
          <React.Fragment key={`${hop.fromUserId}-${hop.toUserId}-${hop.primarySkillName}-${index}`}>
            <div className={cn('flex flex-col items-center gap-2', compact ? 'shrink-0' : 'min-w-0 flex-1')}>
              <Avatar className={cn(
                compact ? 'h-9 w-9' : 'h-11 w-11',
                'border border-border bg-background ring-2 ring-background',
                isCurrent && 'border-primary ring-primary/30'
              )}>
                <AvatarFallback className={cn('font-bold', compact ? 'text-[10px]' : 'text-xs', isCurrent ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground')}>
                  {isCurrent ? 'YOU' : initials(hop.fromUserName)}
                </AvatarFallback>
              </Avatar>
              {!compact && (
                <div className="w-full min-w-0 text-center">
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

function ChainLoopVisualizer({
  item,
  currentUserId,
}: {
  item: ScoredCycleDto;
  currentUserId?: string;
}) {
  const { cycle, score } = item;
  const nodes = cycle.hops.map((hop, index) => {
    const angle = -Math.PI / 2 + (index / cycle.hops.length) * Math.PI * 2;
    const radiusX = 32;
    const radiusY = 30;
    return {
      id: hop.fromUserId,
      name: hop.fromUserName,
      offers: hop.primarySkillName,
      wants: cycle.hops.find((candidate) => candidate.toUserId === hop.fromUserId)?.primarySkillName,
      x: 50 + Math.cos(angle) * radiusX,
      y: 50 + Math.sin(angle) * radiusY,
      isCurrent: hop.fromUserId === currentUserId,
    };
  });

  const closedLoopLabel = `${cycle.hops.length}-person circular economy`;

  return (
    <div className="space-y-5">
      <div className="relative h-[390px] overflow-hidden rounded-xl border border-border/60 bg-background/50 sm:h-[420px]">
          <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-primary/25 bg-primary/10 text-primary">
              Animated loop
            </Badge>
            <Badge variant="outline" className="rounded-full bg-background/70">
              {closedLoopLabel}
            </Badge>
          </div>

          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="skill-chain-loop-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="55%" stopColor="hsl(var(--secondary))" stopOpacity="0.85" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <motion.circle
              cx="50"
              cy="50"
              r="33"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.6"
              strokeDasharray="2 3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ duration: 0.4 }}
            />
            {nodes.map((node, index) => {
              const next = nodes[(index + 1) % nodes.length];
              return (
                <React.Fragment key={`${node.id}-${next.id}`}>
                  <motion.line
                    x1={node.x}
                    y1={node.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="url(#skill-chain-loop-gradient)"
                    strokeWidth="1.15"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.82 }}
                    transition={{ delay: index * 0.18, duration: 0.55, ease: 'easeOut' }}
                  />
                  <motion.circle
                    r="1.15"
                    fill="hsl(var(--secondary))"
                    initial={{ cx: node.x, cy: node.y, opacity: 0 }}
                    animate={{ cx: [node.x, next.x], cy: [node.y, next.y], opacity: [0, 1, 0] }}
                    transition={{
                      delay: 0.8 + index * 0.22,
                      duration: 1.15,
                      repeat: Infinity,
                      repeatDelay: Math.max(1.6, nodes.length * 0.22),
                      ease: 'easeInOut',
                    }}
                  />
                </React.Fragment>
              );
            })}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-primary/25 bg-card/90 text-center shadow-lg backdrop-blur sm:h-24 sm:w-24">
            <p className="font-headline text-2xl font-extrabold text-primary sm:text-3xl">{score}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">chain score</p>
          </div>

          {nodes.map((node, index) => (
            <div
              key={node.id}
              className="absolute z-20"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.82, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.16 + index * 0.12, duration: 0.35, ease: 'easeOut' }}
                className={cn(
                  'w-20 rounded-xl border bg-card/95 p-1.5 text-center shadow-sm backdrop-blur sm:w-32 sm:p-2.5',
                  node.isCurrent ? 'border-primary/45 ring-2 ring-primary/20' : 'border-border/70',
                )}
              >
                <Avatar className="mx-auto h-7 w-7 border border-border bg-background sm:h-9 sm:w-9">
                  <AvatarFallback className={cn('text-[10px] font-extrabold', node.isCurrent ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground')}>
                    {node.isCurrent ? 'YOU' : initials(node.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-1.5 truncate text-[10px] font-extrabold text-foreground sm:mt-2 sm:text-xs">{node.isCurrent ? 'You' : node.name}</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-primary">Offers {node.offers}</p>
                {node.wants && (
                  <p className="mt-0.5 hidden truncate text-[10px] text-muted-foreground sm:block">Needs {node.wants}</p>
                )}
              </motion.div>
            </div>
          ))}
        </div>

      <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Closed-loop story</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every person teaches one skill and receives another, so the platform creates a circular exchange without requiring money.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {cycle.hops.map((hop, index) => (
            <motion.div
              key={`${hop.fromUserId}-${hop.toUserId}-${hop.primarySkillName}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.24 + index * 0.1 }}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{hop.fromUserName} teaches {hop.toUserName}</p>
                <p className="truncate text-xs text-muted-foreground">{hop.primarySkillName}</p>
              </div>
              {index === cycle.hops.length - 1 ? (
                <RotateCcw className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
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
          title={!target ? 'Add more skills to your profile to unlock this chain action' : undefined}
        >
          {target?.actionLabel ?? 'Unavailable'}
        </Button>
      </div>
    </motion.div>
  );
}

export const SkillChainsTab: FC = () => {
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

        <div className="grid xl:grid-cols-[1.45fr_0.85fr]">
          <div className="border-b border-border/70 p-5 dark:border-white/10 xl:border-b-0 xl:border-r">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-base font-bold">Best path</p>
              {selectedCycle && (
                <Badge className="hidden rounded-xl border border-secondary/35 bg-secondary/10 px-3 py-1 text-secondary hover:bg-secondary/10 sm:inline-flex">
                  {selectedCycle.score}% match
                </Badge>
              )}
            </div>

            {selectedCycle ? (
              <>
                <ChainLoopVisualizer item={selectedCycle} currentUserId={user?.id} />
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
