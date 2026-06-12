import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeftRight,
  RotateCcw,
  Users,
  Clock3,
  Star,
  Gauge,
  Layers,
  GraduationCap,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Hourglass,
  RefreshCw,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ExchangeCycleData, ScoredCycleDto } from '@/features/match/components/ExchangeChainCard';
import {
  MatchService,
  type ChainActivationHop,
  type ChainHopState,
  type ChainStatusResult,
} from '@/services/matchService';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isPersistedId = (value?: string) => Boolean(value && UUID_PATTERN.test(value));

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

function estimatedTime(cycle: ExchangeCycleData) {
  if (cycle.hops.length <= 2) return '~1 week';
  if (cycle.hops.length <= 4) return '~2 weeks';
  return '~2-3 weeks';
}

const STATUS_META: Record<ChainHopState, { label: string; icon: FC<{ className?: string }>; className: string }> = {
  NONE:      { label: 'Not started', icon: CircleDashed, className: 'border-border bg-muted/40 text-muted-foreground' },
  PENDING:   { label: 'Pending',     icon: Hourglass,    className: 'border-secondary/40 bg-secondary/10 text-secondary' },
  ACCEPTED:  { label: 'Accepted',    icon: CheckCircle2, className: 'border-primary/40 bg-primary/10 text-primary' },
  COMPLETED: { label: 'Done',        icon: CheckCircle2, className: 'border-primary/40 bg-primary/15 text-primary' },
  DECLINED:  { label: 'Declined',    icon: XCircle,      className: 'border-destructive/40 bg-destructive/10 text-destructive' },
  CANCELLED: { label: 'Cancelled',   icon: XCircle,      className: 'border-border bg-muted/40 text-muted-foreground' },
};

function HopStatusPill({ state }: { state: ChainHopState }) {
  const meta = STATUS_META[state];
  const Icon = meta.icon;
  return (
    <span className={cn('flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', meta.className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: ScoredCycleDto | null;
  currentUserId?: string;
  onActivate: (cycle: ExchangeCycleData) => void;
  onRequestJoin: (cycle: ExchangeCycleData) => void;
  activating?: boolean;
}

/** A single labelled quality bar driven by a real backend sub-score in [0, 1]. */
function FactorBar({
  icon: Icon,
  label,
  weight,
  value,
  display,
}: {
  icon: FC<{ className?: string }>;
  label: string;
  weight: string;
  value: number;
  display: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {label}
          <span className="text-[10px] font-medium text-muted-foreground">{weight}</span>
        </span>
        <span className="font-bold tabular-nums text-foreground">{display}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export const ChainDetailSheet: FC<Props> = ({
  open,
  onClose,
  item,
  currentUserId,
  onActivate,
  onRequestJoin,
  activating = false,
}) => {
  const cycle = item?.cycle;

  const role = useMemo(() => {
    if (!cycle || !currentUserId) return null;
    const isParticipant = cycle.userIds.includes(currentUserId);
    if (!isParticipant) return { isParticipant };
    // The hop whose learner is you = the skill you GET (couldn't get via a direct swap).
    const getHop = cycle.hops.find((h) => h.toUserId === currentUserId);
    // The hop whose teacher is you = the skill you GIVE into the loop.
    const giveHop = cycle.hops.find((h) => h.fromUserId === currentUserId);
    return { isParticipant, getHop, giveHop };
  }, [cycle, currentUserId]);

  const canActivate = useMemo(
    () => Boolean(cycle && cycle.hops.every((h) => h.matchingSkillIds?.some(isPersistedId))),
    [cycle],
  );

  // Hops with a confirmed (persisted) skill — required to query/activate the chain.
  const persistedHops = useMemo<ChainActivationHop[] | null>(() => {
    if (!cycle) return null;
    const hops = cycle.hops.map((h) => ({
      fromUserId: h.fromUserId,
      toUserId: h.toUserId,
      skillId: h.matchingSkillIds?.find(isPersistedId) ?? '',
    }));
    return hops.some((h) => !h.skillId) ? null : hops;
  }, [cycle]);

  const isParticipant = Boolean(role?.isParticipant);
  const [status, setStatus] = useState<ChainStatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!open || !isParticipant || !persistedHops) {
      setStatus(null);
      return;
    }
    setStatusLoading(true);
    try {
      setStatus(await MatchService.getChainStatus(persistedHops));
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [open, isParticipant, persistedHops]);

  // Refetch on open, when the chain changes, and after an activation attempt settles.
  useEffect(() => { void fetchStatus(); }, [fetchStatus, activating]);

  if (!item || !cycle) {
    return <Sheet open={open} onOpenChange={(v) => !v && onClose()}><SheetContent /></Sheet>;
  }

  const is2Way = cycle.hops.length === 2;
  const swaps = Math.max(1, cycle.hops.length - 1);
  const fit = item.score >= 75 ? 'Great fit' : item.score >= 60 ? 'Good fit' : 'Fair fit';
  const started = Boolean(status?.started);
  const confirmed = (status?.accepted ?? 0) + (status?.completed ?? 0);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {/* Header */}
        <SheetHeader className="space-y-0 border-b border-border/70 bg-muted/20 p-5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              {is2Way ? <ArrowLeftRight className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-headline text-lg font-extrabold tracking-tight">
                {is2Way ? 'Perfect 2-way swap' : `${cycle.userIds.length}-person skill loop`}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {cycle.userNames.join(' → ')} → {cycle.userNames[0]}
              </SheetDescription>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(hsl(var(--primary)) ${item.score * 3.6}deg, hsl(var(--muted)) 0deg)` }}
            >
              <div className="grid h-11 w-11 place-items-center rounded-full bg-card font-headline text-base font-extrabold">
                {item.score}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{fit}</p>
              <p className="text-xs text-muted-foreground">Chain score out of 100</p>
            </div>
            <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
              {started && (
                <Badge className="rounded-full border border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/10">
                  <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                  In motion
                </Badge>
              )}
              {isParticipant && (
                <Badge className="rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                  You're in this loop
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* The payoff: what direct matching couldn't give you */}
          {isParticipant && role?.getHop && (
            <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Why this loop works for you
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                No one had to swap with you directly. Through this loop you{' '}
                <span className="font-bold text-primary">learn {role.getHop.primarySkillName}</span> from{' '}
                {role.getHop.fromUserName}
                {role.giveHop && (
                  <>
                    {' '}— in return you{' '}
                    <span className="font-bold text-foreground">teach {role.giveHop.primarySkillName}</span> to{' '}
                    {role.giveHop.toUserName}
                  </>
                )}
                .
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 bg-card p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">You learn</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-primary">{role.getHop.primarySkillName}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">You teach</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-foreground">{role.giveHop?.primarySkillName ?? '—'}</p>
                </div>
              </div>
            </div>
          )}

          {!isParticipant && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/[0.07] p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-secondary">
                <Info className="h-3.5 w-3.5" /> You're not in this loop yet
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                Send a request to join. If a member accepts, you slot into the ring — teaching one skill and
                learning another, all without needing money or a direct mutual match.
              </p>
            </div>
          )}

          {/* Live progress once the chain has been started */}
          {started && status && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/[0.06] p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-secondary">
                  <Hourglass className="h-3.5 w-3.5" /> Chain progress
                </p>
                <span className="text-xs font-bold tabular-nums text-foreground">
                  {confirmed}/{status.totalHops} confirmed
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${status.progress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {status.pending > 0
                  ? `${status.pending} member${status.pending === 1 ? '' : 's'} still need${status.pending === 1 ? 's' : ''} to confirm their part.`
                  : status.declined > 0
                    ? `${status.declined} hop${status.declined === 1 ? '' : 's'} declined — the loop may need a new path.`
                    : 'Every hop is confirmed. The loop is ready to run.'}
              </p>
            </div>
          )}

          {/* The ordered exchange path */}
          <div>
            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Exchange path
            </p>
            <div className="space-y-2">
              {cycle.hops.map((hop, index) => {
                const teacherIsYou = hop.fromUserId === currentUserId;
                const learnerIsYou = hop.toUserId === currentUserId;
                const isLast = index === cycle.hops.length - 1;
                return (
                  <motion.div
                    key={`${hop.fromUserId}-${hop.toUserId}-${index}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3',
                      teacherIsYou || learnerIsYou
                        ? 'border-primary/35 bg-primary/[0.05]'
                        : 'border-border/60 bg-card',
                    )}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <Avatar className="h-9 w-9 shrink-0 border border-border bg-background">
                      <AvatarFallback className={cn('text-[10px] font-bold', teacherIsYou ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground')}>
                        {teacherIsYou ? 'YOU' : initials(hop.fromUserName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {teacherIsYou ? 'You' : hop.fromUserName}
                        <span className="font-normal text-muted-foreground"> teach{teacherIsYou ? '' : 'es'} </span>
                        {learnerIsYou ? 'you' : hop.toUserName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs">
                        <GraduationCap className="h-3 w-3 shrink-0 text-secondary" />
                        <span className="truncate font-semibold text-primary">{hop.primarySkillName}</span>
                        {hop.matchingSkillIds && hop.matchingSkillIds.length > 1 && (
                          <span className="text-muted-foreground">+{hop.matchingSkillIds.length - 1} more</span>
                        )}
                      </p>
                    </div>
                    {started && status?.hops[index] && (
                      <HopStatusPill state={status.hops[index].status} />
                    )}
                    {isLast ? (
                      <RotateCcw className="h-4 w-4 shrink-0 text-primary" aria-label="Closes the loop" />
                    ) : (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Real, transparent score breakdown (backend sub-scores) */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" /> How this score is built
            </p>
            <div className="space-y-3">
              <FactorBar
                icon={Star}
                label="Teacher ratings"
                weight="×40"
                value={item.averageRating}
                display={`${(item.averageRating * 5).toFixed(1)}/5`}
              />
              <FactorBar
                icon={Layers}
                label="Skill match quality"
                weight="×35"
                value={item.skillMatchQuality}
                display={`${Math.round(item.skillMatchQuality * 100)}%`}
              />
              <FactorBar
                icon={Gauge}
                label="Availability (weakest link)"
                weight="×25"
                value={item.sessionAvailability}
                display={`${Math.round(item.sessionAvailability * 100)}%`}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
              <Users className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="font-headline text-base font-extrabold">{cycle.userIds.length}</p>
              <p className="text-[10px] text-muted-foreground">People</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
              <ArrowLeftRight className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="font-headline text-base font-extrabold">{swaps}</p>
              <p className="text-[10px] text-muted-foreground">Swaps</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
              <Clock3 className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="font-headline text-base font-extrabold">{estimatedTime(cycle)}</p>
              <p className="text-[10px] text-muted-foreground">Est. time</p>
            </div>
          </div>
        </div>

        {/* Sticky activation footer */}
        <div className="border-t border-border/70 bg-muted/20 p-5 dark:border-white/10">
          {isParticipant && started ? (
            <>
              <p className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                This chain is in motion. Confirm your own part in <strong className="px-1 text-foreground">Exchange requests</strong>;
                this view updates as the others accept.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1 rounded-xl gap-2"
                  disabled={statusLoading}
                  onClick={() => void fetchStatus()}
                >
                  <RefreshCw className={cn('h-4 w-4', statusLoading && 'animate-spin')} />
                  {statusLoading ? 'Refreshing…' : 'Refresh progress'}
                </Button>
              </div>
            </>
          ) : isParticipant ? (
            <>
              <p className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Starting creates <strong className="px-1 text-foreground">{cycle.hops.length} pending swap requests</strong>
                — one per hop. Every member is notified and confirms their part; nothing is final until they accept.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1 rounded-xl"
                  disabled={activating || !canActivate}
                  onClick={() => onActivate(cycle)}
                  title={!canActivate ? 'A hop is missing a confirmed skill — try another chain.' : undefined}
                >
                  {activating ? 'Starting…' : 'Start this chain'}
                </Button>
              </div>
              {!canActivate && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  This loop has a hop without a confirmed skill yet, so it can't be started.
                </p>
              )}
            </>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                Close
              </Button>
              <Button variant="gradient" className="flex-1 rounded-xl" onClick={() => onRequestJoin(cycle)}>
                Request to join
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
