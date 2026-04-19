
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useExchanges } from '@/hooks/useExchanges';
import { useConnections } from '@/hooks/useConnections';
import { exchangeService } from '@/services/exchangeService';
import { connectionService } from '@/services/connectionService';
import { DashboardService } from '@/services/dashboardService';
import type { Exchange } from '@/services/exchangeService';
import type { Connection } from '@/services/connectionService';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle,
  Clock,
  MessageSquare,
  Search,
  Star,
  Users,
  Video,
  Zap,
  Inbox,
  Award,
  Activity,
  BarChart3,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Link, useNavigate } from 'react-router-dom';
import { useCounter } from '@/hooks/useCounter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ActivityChart } from '@/features/dashboard/components/ActivityChart';
import { SessionCarousel } from '@/features/dashboard/components/SessionCarousel';
import { TaskProgressWidget } from '@/features/dashboard/components/TaskProgressWidget';
import { BoostBanner } from '@/features/dashboard/components/BoostBanner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Skill } from '@/types';

/* ─────────────────────────────────────────────────────────────
   SHNEIDERMAN DESIGN PRINCIPLES APPLIED:
   1. Consistency   — Same card treatment, same spacing, same color token usage
   2. Shortcuts     — Action buttons always reachable, tab navigation
   3. Feedback      — Status badges, counters, loading states, toasts
   4. Closure       — Dialogs confirm completion, booking shows ✓ state
   5. Error prevent — Confirm dialogs before destructive actions
   6. Reversal      — Decline has a "Keep it" option
   7. Locus control — User decides exchanges, sessions — nothing dumps on them
   8. Memory load   — Current state always visible (status badges, progress)
───────────────────────────────────────────────────────────── */

/* ─── Shared type for stat cards ─────────────────────────────── */
interface StatCardProps {
  icon: React.FC<{ className?: string }>;
  title: string;
  value: number;
  footnote: string;
  index: number;
}

/* ─── Consistent stat card ────────────────────────────────────── */
const StatCard = React.memo(({ icon: Icon, title, value, footnote, index }: StatCardProps) => {
  const { ref } = useCounter(value, { duration: 1.6 });

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 220, damping: 22 }}
      className="h-full"
    >
      <Card className="group relative h-full w-full overflow-hidden border-white/5 bg-card/80 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:shadow-glow-sm shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        {/* Consistent left-edge accent — always primary color */}
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_10px_var(--primary)]" />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-[0_0_12px_var(--primary)]">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-0">
          <div
            ref={ref}
            className="font-headline text-[32px] font-bold tabular-nums tracking-tight text-foreground leading-none"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{footnote}</p>

          {/* Animated sparkline */}
          <div className="mt-4 h-6 w-full opacity-40 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-[0_0_4px_var(--primary)]">
            <svg viewBox="0 0 120 28" className="h-full w-full" preserveAspectRatio="none">
              <motion.path
                d="M0,24 Q20,20 35,13 T70,10 T100,6 T120,2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-primary"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.8, delay: 0.2 + index * 0.12, ease: 'easeOut' }}
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
StatCard.displayName = 'StatCard';

/* ─── Status badge config ─────────────────────────────────────── */
type ExchangeStatus = 'accepted' | 'pending' | 'completed' | 'declined';

const STATUS: Record<ExchangeStatus, { label: string; variant: 'default' | 'secondary' | 'outline'; dot: string }> = {
  accepted: { label: 'Active',    variant: 'default',    dot: 'bg-emerald-500' },
  pending:  { label: 'Pending',   variant: 'secondary',  dot: 'bg-amber-500'   },
  completed:{ label: 'Completed', variant: 'outline',    dot: 'bg-primary'     },
  declined: { label: 'Declined',  variant: 'outline',    dot: 'bg-muted-foreground' },
};

/* ─── Exchange card ───────────────────────────────────────────── */
function ExchangeCard({ exchange, currentUserId }: { exchange: Exchange; currentUserId: string }) {
  const isRequester = exchange.requester.id === currentUserId;
  const partner = isRequester ? exchange.receiver : exchange.requester;
  const mySkill = isRequester ? exchange.offeredSkill : exchange.wantedSkill;
  const theirSkill = isRequester ? exchange.wantedSkill : exchange.offeredSkill;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [localStatus, setLocalStatus] = React.useState<ExchangeStatus>(
    (exchange.status?.toLowerCase() as ExchangeStatus) ?? 'pending'
  );
  const [dismissed, setDismissed] = React.useState(false);
  const [declineConfirmOpen, setDeclineConfirmOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [scheduledConfirmed, setScheduledConfirmed] = useState(false);

  if (dismissed) return null;

  const cfg = STATUS[localStatus] ?? STATUS.pending;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
    >
      <Card className="group h-full border-border/60 bg-card transition-all duration-300 hover:border-border hover:shadow-md dark:border-white/[0.07] dark:hover:border-white/[0.13]">
        <CardContent className="p-5">
          {/* Partner row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10 ring-1 ring-border group-hover:ring-primary/25 transition-all duration-300">
                  <AvatarImage src={partner.avatar ?? undefined} />
                  <AvatarFallback className="bg-muted text-sm font-semibold">
                    {partner.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                  cfg.dot
                )} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground leading-tight">
                  {partner.name}
                </p>
                <p className="truncate text-xs text-muted-foreground mt-0.5">
                  {partner.university ?? 'University'}
                </p>
              </div>
            </div>
            <Badge variant={cfg.variant} className="shrink-0 text-[10px] font-semibold capitalize rounded-full px-2 py-0.5">
              {cfg.label}
            </Badge>
          </div>

          {/* Skill swap */}
          <div className="mt-4 space-y-1.5">
            {mySkill && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
                <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">You teach</span>
                <span className="ml-auto text-xs font-semibold text-foreground truncate max-w-[100px]">
                  {mySkill.name}
                </span>
              </div>
            )}
            {theirSkill && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
                <BookOpen className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {partner.name.split(' ')[0]} teaches
                </span>
                <span className="ml-auto text-xs font-semibold text-foreground truncate max-w-[100px]">
                  {theirSkill.name}
                </span>
              </div>
            )}
          </div>

          {exchange.sessionDate && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {new Date(exchange.sessionDate).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {localStatus === 'pending' && exchange.receiver.id === currentUserId ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs border-destructive/20 text-destructive hover:bg-destructive/8 hover:border-destructive/30"
                  onClick={() => setDeclineConfirmOpen(true)}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90"
                  onClick={async () => {
                    try {
                      await exchangeService.updateStatus(exchange.id, 'accepted');
                      setLocalStatus('accepted');
                      toast({ title: 'Request accepted', description: `Now matched with ${partner.name.split(' ')[0]}.`, variant: 'success' });
                    } catch {
                      toast({ title: 'Failed to accept', variant: 'destructive' });
                    }
                  }}
                >
                  Accept
                </Button>
              </>
            ) : localStatus === 'pending' ? (
              <Button variant="outline" size="sm" className="col-span-2 rounded-lg text-xs text-muted-foreground" disabled>
                Awaiting response
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => {
                    navigate('/community');
                    toast({ title: 'Opening Community' });
                  }}
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Message
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg text-xs font-semibold"
                  onClick={() => setScheduleOpen(true)}
                >
                  <Video className="mr-1.5 h-3.5 w-3.5" />
                  Schedule
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={declineConfirmOpen}
        onOpenChange={setDeclineConfirmOpen}
        title={`Decline ${partner.name.split(' ')[0]}'s request?`}
        description="This action can't be undone. They won't receive a notification."
        confirmLabel="Decline"
        cancelLabel="Keep it"
        variant="destructive"
        onConfirm={async () => {
          try {
            await exchangeService.updateStatus(exchange.id, 'declined');
            setDismissed(true);
            toast({ title: 'Request declined', variant: 'destructive' });
          } catch {
            toast({ title: 'Failed to decline', variant: 'destructive' });
          }
        }}
      />

      {/* Schedule dialog */}
      <Dialog
        open={scheduleOpen}
        onOpenChange={(o) => {
          setScheduleOpen(o);
          if (!o) { setScheduleDate(''); setScheduleTime(''); setSessionNotes(''); setScheduledConfirmed(false); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline">
              <CalendarDays className="h-5 w-5 text-primary" />
              {scheduledConfirmed ? 'Session Confirmed' : 'Schedule a Session'}
            </DialogTitle>
            <DialogDescription>
              {scheduledConfirmed
                ? `Your session with ${partner?.name?.split(' ')[0]} is set.`
                : `Choose a time to meet with ${partner?.name?.split(' ')[0]}.`}
            </DialogDescription>
          </DialogHeader>

          {scheduledConfirmed ? (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20"
              >
                <CheckCircle className="h-7 w-7 text-primary" />
              </motion.div>
              <div>
                <p className="text-base font-semibold">{scheduleDate} at {scheduleTime}</p>
                {sessionNotes && <p className="text-sm text-muted-foreground mt-1">"{sessionNotes}"</p>}
              </div>
              <Button className="w-full" onClick={() => setScheduleOpen(false)}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="session-date">Date</Label>
                    <Input id="session-date" type="date" value={scheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setScheduleDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="session-time">Time</Label>
                    <Input id="session-time" type="time" value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="session-notes">
                    Notes <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Textarea id="session-notes" placeholder="What to cover, meeting link…"
                    value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                    rows={2} className="rounded-xl resize-none text-sm" />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={partner?.avatar ?? undefined} />
                    <AvatarFallback className="text-xs font-semibold">{partner?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{partner?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mySkill && theirSkill ? `${mySkill.name} ↔ ${theirSkill.name}` : 'Skill exchange'}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                <Button disabled={!scheduleDate || !scheduleTime} onClick={() => setScheduledConfirmed(true)}>
                  <CalendarDays className="mr-2 h-4 w-4" /> Confirm
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ─── Empty Exchanges ─────────────────────────────────────────── */
function EmptyExchanges() {
  return (
    <Card className="border-dashed border-border/60 bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50"
        >
          <Inbox className="h-7 w-7 text-muted-foreground/60" />
        </motion.div>
        <h3 className="text-sm font-semibold text-foreground">No active exchanges</h3>
        <p className="mt-2 text-xs text-muted-foreground max-w-[30ch] leading-relaxed">
          Find a skill partner, send a request, and start your first exchange.
        </p>
        <Button asChild className="mt-6 rounded-lg" size="sm">
          <Link to="/match">
            <Search className="mr-2 h-4 w-4" /> Browse Marketplace
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ExchangeSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Activity mapping ────────────────────────────────────────── */
function activityFromExchange(exchange: Exchange, currentUserId: string) {
  const partner = exchange.requester.id === currentUserId ? exchange.receiver : exchange.requester;
  const ms = Date.now() - new Date(exchange.createdAt).getTime();
  const mins = Math.round(ms / 60000);
  const time = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
  const s = exchange.status?.toLowerCase();

  switch (s) {
    case 'accepted':
      return { avatar: partner.avatar, name: partner.name, Icon: CheckCircle, iconCls: 'text-emerald-500', bg: 'bg-emerald-500/10', text: <><span className="font-semibold text-foreground">{partner.name.split(' ')[0]}</span> accepted your request.</>, time };
    case 'pending':
      return exchange.requester.id === currentUserId
        ? { avatar: partner.avatar, name: partner.name, Icon: Clock, iconCls: 'text-amber-500', bg: 'bg-amber-500/10', text: <>Awaiting <span className="font-semibold text-foreground">{partner.name.split(' ')[0]}</span>.</>, time }
        : { avatar: partner.avatar, name: partner.name, Icon: Users, iconCls: 'text-primary', bg: 'bg-primary/10', text: <><span className="font-semibold text-foreground">{partner.name.split(' ')[0]}</span> sent you a request.</>, time };
    case 'completed':
      return { avatar: partner.avatar, name: partner.name, Icon: Star, iconCls: 'text-amber-500', bg: 'bg-amber-500/10', text: <>Session with <span className="font-semibold text-foreground">{partner.name.split(' ')[0]}</span> completed.</>, time };
    default:
      return null;
  }
}

/* ─── Onboarding strip (compact, horizontal) ─────────────────── */
function OnboardingProgress({
  user,
  exchanges,
}: {
  user: { skillsOffered?: unknown[]; skillsWanted?: unknown[] } | null;
  exchanges: Exchange[];
}) {
  const hasSkills = (user?.skillsOffered?.length ?? 0) > 0 || (user?.skillsWanted?.length ?? 0) > 0;
  const hasMatch = exchanges.length > 0;
  const hasSession = exchanges.some(
    e => e.status?.toLowerCase() === 'accepted' && e.sessionDate
  );

  const steps = [
    { title: 'Add skills', done: hasSkills, link: '/settings?tab=skills', Icon: Zap },
    { title: 'Find a match', done: hasMatch, link: '/match', Icon: Search },
    { title: 'Schedule session', done: hasSession, link: '/match', Icon: CalendarDays },
  ];

  const completed = steps.filter(s => s.done).length;
  if (completed === steps.length) return null;

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <ScrollReveal animation="fade-up" delay={0.1}>
      <Card className="border-border/60 bg-card dark:border-white/[0.07]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-semibold text-foreground">Getting started</h3>
                <span className="text-xs font-semibold text-primary">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {steps.map((step, i) => (
                <Link
                  key={i}
                  to={step.link}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
                    step.done
                      ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 cursor-default pointer-events-none'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                  )}
                >
                  {step.done
                    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    : <step.Icon className="h-3.5 w-3.5" />}
                  {step.title}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}

/* ─── Section heading (consistent typography) ────────────────── */
function SectionHeading({
  icon: Icon,
  children,
  action,
}: {
  icon?: React.FC<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-headline text-base font-semibold tracking-tight text-foreground">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ─── Rank widget ─────────────────────────────────────────────── */
function RankWidget({ score }: { score: number }) {
  const ranks = [
    { label: 'Explorer',  min: 0,   pct: '#64748b' },
    { label: 'Learner',   min: 50,  pct: '#10b981' },
    { label: 'Mentor',    min: 150, pct: '#3b82f6' },
    { label: 'Expert',    min: 300, pct: '#8b5cf6' },
    { label: 'Master',    min: 500, pct: 'hsl(var(--primary))' },
  ];
  const rankIdx = [...ranks].reverse().findIndex(r => score >= r.min);
  const current = [...ranks].reverse()[rankIdx] ?? ranks[0];
  const next    = ranks[ranks.indexOf(current) + 1];
  const pct = next
    ? Math.min(((score - current.min) / (next.min - current.min)) * 100, 100)
    : 100;

  return (
    <Card className="border-border/60 bg-card dark:border-white/[0.07]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rank</p>
              <p className="text-sm font-bold text-foreground">{current.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="font-headline text-xl font-bold text-foreground tabular-nums">{score}</p>
          </div>
        </div>

        {next && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground">
                {next.min - score} pts to <span className="font-semibold">{next.label}</span>
              </p>
              <p className="text-xs font-semibold text-primary">{Math.round(pct)}%</p>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Sidebar: Connections tab ────────────────────────────────── */
function ConnectionsTab({
  connections,
  loading,
  busy,
  onUpdate,
  currentUserId,
}: {
  connections: Connection[];
  loading: boolean;
  busy: Record<string, boolean>;
  onUpdate: (c: Connection, s: 'accepted' | 'declined') => Promise<void>;
  currentUserId: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center p-4">
        <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-semibold text-foreground">No pending requests</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Connection requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {connections.slice(0, 4).map((conn, i) => {
        const partner = conn.requester.id === currentUserId ? conn.receiver : conn.requester;
        return (
          <motion.div
            key={conn.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-muted/20 p-3 hover:bg-muted/40 transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={partner.avatar ?? undefined} />
                <AvatarFallback className="text-xs font-semibold bg-muted">
                  {partner.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{partner.name}</p>
                <p className="truncate text-xs text-muted-foreground">@{partner.username ?? 'user'}</p>
              </div>
            </div>
            {conn.message && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                "{conn.message}"
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs border-destructive/20 text-destructive hover:bg-destructive/8"
                onClick={() => onUpdate(conn, 'declined')}
                disabled={busy[conn.id]}
              >
                Decline
              </Button>
              <Button
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => onUpdate(conn, 'accepted')}
                disabled={busy[conn.id]}
              >
                {busy[conn.id] ? 'Accepting…' : 'Accept'}
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Sidebar: Skills tab ─────────────────────────────────────── */
function SkillsTab({
  user,
}: {
  user: { skillsOffered?: Skill[]; skillsWanted?: Skill[]; id?: string } | null;
}) {
  const offered = user?.skillsOffered ?? [];
  const wanted  = user?.skillsWanted  ?? [];

  return (
    <div className="space-y-5 p-4">
      {/* Teaching */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teaching</p>
          <Badge variant="secondary" className="ml-auto text-[10px] rounded-full">{offered.length}</Badge>
        </div>
        {!user ? (
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}
          </div>
        ) : offered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">No skills added yet.</p>
            <Button asChild size="sm" variant="link" className="h-auto p-0 text-xs text-primary mt-1">
              <Link to={`/profile/${user?.id}`}>Add skills to teach →</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {offered.slice(0, 6).map((skill, i) => (
              <motion.span
                key={skill.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary dark:text-primary"
              >
                {skill.name}
              </motion.span>
            ))}
            {offered.length > 6 && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                +{offered.length - 6}
              </span>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Learning */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-secondary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learning</p>
          <Badge variant="secondary" className="ml-auto text-[10px] rounded-full">{wanted.length}</Badge>
        </div>
        {!user ? (
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}
          </div>
        ) : wanted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">No learning goals added yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {wanted.slice(0, 6).map((skill, i) => (
              <motion.span
                key={skill.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="inline-flex items-center rounded-full border border-secondary/25 bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary dark:text-secondary"
              >
                {skill.name}
              </motion.span>
            ))}
            {wanted.length > 6 && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                +{wanted.length - 6}
              </span>
            )}
          </div>
        )}
      </div>

      <Button asChild variant="outline" size="sm" className="w-full rounded-lg text-xs mt-1">
        <Link to={`/profile/${user?.id}`}>
          Manage Skills <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

/* ─── Sidebar: Activity tab ───────────────────────────────────── */
function ActivityTab({ items }: { items: ReturnType<typeof activityFromExchange>[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center p-4">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border"
        >
          <Activity className="h-5 w-5 text-muted-foreground/60" />
        </motion.div>
        <p className="text-sm font-semibold text-foreground">No recent activity</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-[24ch]">
          Activity from exchanges will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40 p-1">
      {items.map((item, i) =>
        item ? (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-1 ring-border">
                {item.avatar
                  ? <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                  : <span className="text-xs font-semibold">{item.name?.charAt(0)}</span>}
              </div>
              <div className={cn(
                'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card',
                item.bg
              )}>
                <item.Icon className={cn('h-2.5 w-2.5', item.iconCls)} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">{item.time}</p>
            </div>
          </motion.div>
        ) : null
      )}
    </div>
  );
}

/* ─── Upcoming Sessions ───────────────────────────────────────── */
function UpcomingSessionsSection({
  sessions,
  loading,
  currentUserId,
}: {
  sessions: Exchange[];
  loading: boolean;
  currentUserId: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map(i => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-semibold">No upcoming sessions</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[26ch]">
          Accept an exchange and schedule your first session.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      {/* Timeline line */}
      <div className="absolute left-[17px] top-5 bottom-5 w-px bg-gradient-to-b from-border via-border/40 to-transparent" />

      {sessions.slice(0, 3).map((exchange, i) => {
        const partner = exchange.requester.id === currentUserId
          ? exchange.receiver
          : exchange.requester;
        const skill = exchange.offeredSkill ?? exchange.wantedSkill;
        const isNext = i === 0;

        return (
          <motion.div
            key={exchange.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative flex items-center gap-3"
          >
            {/* Timeline dot */}
            <div className={cn(
              'relative z-10 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-card shadow-sm',
              isNext ? 'bg-primary' : 'bg-border'
            )}>
              {isNext && (
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-50" />
              )}
            </div>

            {/* Card */}
            <div className={cn(
              'flex flex-1 items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200',
              isNext
                ? 'border-primary/20 bg-primary/5 dark:bg-primary/8'
                : 'border-border/50 bg-muted/20 hover:bg-muted/40'
            )}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={partner.avatar ?? undefined} />
                <AvatarFallback className="text-xs font-semibold">{partner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {skill?.name ?? 'Skill Exchange'}
                  <span className="font-normal text-muted-foreground"> with </span>
                  {partner.name.split(' ')[0]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {exchange.sessionDate
                    ? new Date(exchange.sessionDate).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })
                    : 'Date TBD'}
                </p>
              </div>
              {isNext && (
                <Button size="sm" className="shrink-0 rounded-lg text-xs h-7 px-2.5">
                  <Play className="h-3 w-3 mr-1" /> Join
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  useDocumentTitle('Dashboard — SkillEx');

  const { user } = useAuth();
  const { toast } = useToast();
  const { exchanges, loading } = useExchanges();
  const {
    connections: pendingIncomingConnections,
    loading: connectionsLoading,
    refetch: refetchConnections,
  } = useConnections({ status: 'pending', direction: 'received' });
  const [connectionBusy, setConnectionBusy] = useState<Record<string, boolean>>({});
  const [serverStats, setServerStats] = React.useState<{
    sessionsCompleted?: number;
    skillexScore?: number;
    activeExchanges?: number;
    pendingConnections?: number;
  } | null>(null);

  React.useEffect(() => {
    DashboardService.getStats()
      .then(s => setServerStats({
        sessionsCompleted: s.sessionsCompleted,
        skillexScore: s.skillexScore,
        activeExchanges: (s.activeExchanges ?? 0) + (s.pendingExchanges ?? 0),
        pendingConnections: s.pendingConnections,
      }))
      .catch(() => {});
  }, []);

  const currentUserId = user?.id ?? '';
  const activeExchanges = exchanges.filter(e => {
    const s = e.status?.toLowerCase();
    return s === 'pending' || s === 'accepted';
  });
  const upcomingSessions = exchanges.filter(
    e => e.status?.toLowerCase() === 'accepted' && e.sessionDate
  );
  const activityItems = exchanges
    .slice(0, 6)
    .map(e => activityFromExchange(e, currentUserId))
    .filter(Boolean);

  const pendingConnectionCount = connectionsLoading
    ? (serverStats?.pendingConnections ?? 0)
    : pendingIncomingConnections.length;

  const handleConnectionUpdate = async (
    connection: Connection,
    status: 'accepted' | 'declined'
  ) => {
    const partner = connection.requester.id === currentUserId
      ? connection.receiver
      : connection.requester;
    setConnectionBusy(prev => ({ ...prev, [connection.id]: true }));
    try {
      await connectionService.updateStatus(connection.id, status);
      await refetchConnections();
      toast({
        title: status === 'accepted' ? 'Connection accepted' : 'Connection declined',
        description: `${partner.name.split(' ')[0]} ${status === 'accepted' ? 'added to your network' : 'request declined'}.`,
        variant: status === 'accepted' ? 'success' : 'destructive',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not update connection.';
      toast({ title: 'Update failed', description: msg, variant: 'destructive' });
    } finally {
      setConnectionBusy(prev => ({ ...prev, [connection.id]: false }));
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const skillexScore = serverStats?.skillexScore ?? user?.skillexScore ?? 0;

  const statCards: StatCardProps[] = [
    {
      icon: BookOpen,
      title: 'Skills Offered',
      value: user?.skillsOffered?.length ?? 0,
      footnote: 'skills you can teach',
      index: 0,
    },
    {
      icon: Users,
      title: 'Active Exchanges',
      value: serverStats?.activeExchanges ?? activeExchanges.length,
      footnote: 'ongoing exchanges',
      index: 1,
    },
    {
      icon: CheckCircle,
      title: 'Sessions Done',
      value: serverStats?.sessionsCompleted ?? user?.sessionsCompleted ?? 0,
      footnote: 'completed sessions',
      index: 2,
    },
    {
      icon: Star,
      title: 'SkillEx Score',
      value: skillexScore,
      footnote: 'your reputation score',
      index: 3,
    },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(min-content,max-content)] gap-4">
        
        {/* ══ HERO (Spans all columns) ══════════════════════════════════ */}
        <ScrollReveal animation="fade-down" delay={0.05} duration={0.6} className="md:col-span-3 lg:col-span-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/80 backdrop-blur-md shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 dot-grid opacity-[0.04] pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between lg:p-6">
              <div className="flex items-center gap-4">
                <div className="relative hidden sm:block shrink-0">
                  <Avatar className="h-12 w-12 ring-2 ring-border shadow-sm">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="text-lg font-bold bg-muted">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {user?.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
                  )}
                </div>
                <div>
                  <motion.p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                    {getGreeting()}
                  </motion.p>
                  <motion.h1 className="font-headline text-xl font-bold tracking-tight text-foreground md:text-2xl">
                    {user?.name?.split(' ')[0] ?? 'Learner'}
                  </motion.h1>
                  <motion.p className="text-xs text-muted-foreground max-w-[42ch]">
                    {user?.university ? `${user.university} · Member since ${new Date(user.joinedAt ?? Date.now()).getFullYear()}` : 'Skill exchange platform'}
                  </motion.p>
                </div>
              </div>
              <motion.div className="flex flex-wrap gap-2.5 shrink-0">
                <Button asChild size="sm" className="rounded-xl font-semibold bg-primary text-primary-foreground shadow-glow-sm hover:brightness-110 border-0">
                  <Link to="/match"><Search className="mr-2 h-3.5 w-3.5" /> Find a Match</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm">
                  <Link to={user?.id ? `/profile/${user.id}` : '/settings'}><BarChart3 className="mr-2 h-3.5 w-3.5" /> Profile</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </ScrollReveal>

        {/* ══ ONBOARDING (Spans all columns if present) ════════════════ */}
        {!loading && user && (
          <div className="md:col-span-3 lg:col-span-4">
            <OnboardingProgress user={user} exchanges={exchanges} />
          </div>
        )}

        {/* ══ STATS (4 columns) ═════════════════════════════════════════ */}
        {statCards.map((card, i) => (
          <div key={card.title} className="col-span-1">
            <ScrollReveal animation="fade-up" delay={0.1 + i * 0.05} className="h-full">
              <StatCard {...card} index={i} />
            </ScrollReveal>
          </div>
        ))}

        {/* ══ BENTO ROW 1 ═══════════════════════════════════════════════ */}
        <div className="md:col-span-2 lg:col-span-2 row-span-2 min-h-[300px] flex flex-col">
          <ScrollReveal animation="fade-right" delay={0.15} className="h-full flex-1">
            <ActivityChart 
              data={[
                { name: 'Aug', hours: 40, amt: 2400 },
                { name: 'Sep', hours: 30, amt: 2210 },
                { name: 'Oct', hours: 60, amt: 2290 },
                { name: 'Nov', hours: 48, amt: 2000 },
                { name: 'Dec', hours: 80, amt: 2181 },
                { name: 'Jan', hours: 75, amt: 2500 },
                { name: 'Feb', hours: 100, amt: 2100 },
                { name: 'Mar', hours: 85, amt: 2100 },
              ]} 
              trend={12} 
            />
          </ScrollReveal>
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 flex flex-col h-full">
          <ScrollReveal animation="fade-up" delay={0.2} className="h-full w-full">
            <BoostBanner />
          </ScrollReveal>
        </div>

        {/* RIGHT COLUMN SIDEBAR TABS (Tall Bento) ═══════════════════════ */}
        <div className="col-span-1 md:col-span-3 lg:col-span-1 lg:row-span-4 flex flex-col h-[500px] lg:h-auto">
          <ScrollReveal animation="fade-left" delay={0.18} className="h-full flex-1 w-full bg-card rounded-3xl border border-white/5 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 pb-0 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-headline text-[13px] font-bold text-foreground uppercase tracking-widest">
                <Users className="h-4 w-4 text-primary" />
                Network
              </h2>
              {pendingConnectionCount > 0 && <Badge className="text-[9px] rounded-full bg-primary/20 text-primary hover:bg-primary/30 border-0">{pendingConnectionCount} pending</Badge>}
            </div>
            <Tabs defaultValue="connections" className="flex-1 flex flex-col min-h-0 mt-3">
              <div className="px-4">
                <TabsList className="w-full bg-muted/40 p-1 h-9 rounded-xl border border-white/5">
                  <TabsTrigger value="connections" className="flex-1 rounded-lg text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">Conn.</TabsTrigger>
                  <TabsTrigger value="skills" className="flex-1 rounded-lg text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">Skills</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1 rounded-lg text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">Activity</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar mt-2">
                <TabsContent value="connections" className="m-0 p-0 focus-visible:outline-none">
                  <ConnectionsTab connections={pendingIncomingConnections} loading={connectionsLoading} busy={connectionBusy} onUpdate={handleConnectionUpdate} currentUserId={currentUserId} />
                </TabsContent>
                <TabsContent value="skills" className="m-0 focus-visible:outline-none">
                  <SkillsTab user={user} />
                </TabsContent>
                <TabsContent value="activity" className="m-0 focus-visible:outline-none">
                  <ActivityTab items={activityItems} />
                </TabsContent>
              </div>
            </Tabs>
          </ScrollReveal>
        </div>

        {/* ══ BENTO ROW 2 ═══════════════════════════════════════════════ */}
        <div className="col-span-1 flex flex-col h-full">
          <ScrollReveal animation="fade-up" delay={0.22} className="h-full">
            <RankWidget score={skillexScore} />
          </ScrollReveal>
        </div>

        {/* ══ BENTO ROW 3 (Carousel + Tasks) ═══════════════════════════ */}
        <div className="md:col-span-2 lg:col-span-2 min-h-[140px] flex flex-col">
          <ScrollReveal animation="fade-up" delay={0.24} className="h-full flex-1 w-full bg-card rounded-3xl border border-white/5 shadow-sm p-4 overflow-hidden shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
             <SessionCarousel exchanges={exchanges} currentUserId={currentUserId} />
          </ScrollReveal>
        </div>
        
        <div className="col-span-1 md:col-span-1 h-full flex flex-col">
          <ScrollReveal animation="fade-left" delay={0.26} className="h-full flex-1">
            <TaskProgressWidget />
          </ScrollReveal>
        </div>

        {/* ══ BENTO ROW 4 (Active Exchanges & Sessions) ═════════════════ */}
        <div className="col-span-1 md:col-span-3 lg:col-span-2 flex flex-col min-h-[300px]">
          <ScrollReveal animation="fade-up" delay={0.25} className="h-full flex flex-col bg-card rounded-3xl border border-white/5 shadow-sm overflow-hidden p-4 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
             <SectionHeading icon={Zap} action={
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary hover:bg-primary/10">
                  <Link to="/match">Explore <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              }>
                Active Exchanges
              </SectionHeading>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-2">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><ExchangeSkeleton /><ExchangeSkeleton /></div>
                ) : activeExchanges.length === 0 ? (
                  <EmptyExchanges />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeExchanges.map(ex => <ExchangeCard key={ex.id} exchange={ex} currentUserId={currentUserId} />)}
                  </div>
                )}
              </div>
          </ScrollReveal>
        </div>

        <div className="col-span-1 md:col-span-3 lg:col-span-1 flex flex-col min-h-[300px]">
           <ScrollReveal animation="fade-up" delay={0.28} className="h-full flex flex-col bg-card rounded-3xl border border-white/5 shadow-sm overflow-hidden p-4 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
             <SectionHeading icon={CalendarDays}>Upcoming</SectionHeading>
             <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
               <UpcomingSessionsSection sessions={upcomingSessions} loading={loading} currentUserId={currentUserId} />
             </div>
           </ScrollReveal>
        </div>

      </div>
    </DashboardLayout>
  );
}
