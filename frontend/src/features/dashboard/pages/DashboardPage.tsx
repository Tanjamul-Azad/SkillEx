
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useExchanges } from '@/hooks/useExchanges';
import { exchangeService } from '@/services/exchangeService';
import { DashboardService } from '@/services/dashboardService';
import type { Exchange } from '@/services/exchangeService';
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
  TrendingUp,
  Users,
  Video,
  Zap,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { useCounter } from '@/hooks/useCounter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ScrollReveal, ScrollRevealGroup } from '@/components/ui/ScrollReveal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

/* ── Consistent color palette for stat cards (Glassmorphism) ────────── */
const STAT_COLORS = {
  primary: { text: 'text-primary', bg: 'bg-primary/5 dark:bg-primary/10', border: 'border-primary/30 hover:border-primary/60', ring: 'shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]', stroke: 'stroke-primary' },
  secondary: { text: 'text-primary', bg: 'bg-primary/5 dark:bg-primary/10', border: 'border-primary/30 hover:border-primary/60', ring: 'shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]', stroke: 'stroke-primary' },
  green: { text: 'text-emerald-400', bg: 'bg-emerald-500/5 dark:bg-emerald-500/10', border: 'border-emerald-500/30 hover:border-emerald-500/60', ring: 'shadow-[0_0_0_1px_hsl(152_69%_31%/0.2)]', stroke: 'stroke-emerald-400' },
  accent: { text: 'text-amber-400', bg: 'bg-amber-500/5 dark:bg-amber-500/10', border: 'border-amber-500/30 hover:border-amber-500/60', ring: 'shadow-[0_0_0_1px_hsl(38_92%_50%/0.2)]', stroke: 'stroke-amber-400' },
} as const;
const DEFAULT_COLORS = STAT_COLORS.primary;

interface StatCardProps {
  icon: React.FC<{ className?: string }>;
  title: string;
  value: number;
  trend: string;
  trendLabel: string;
  colorKey: keyof typeof STAT_COLORS;
  index: number;
}

const StatCard = React.memo(({ icon: Icon, title, value, trend, trendLabel, colorKey, index }: StatCardProps) => {
  const { ref } = useCounter(value, { duration: 2 });
  const isPositive = trend.startsWith('+');
  const c = (STAT_COLORS as any)[colorKey] ?? DEFAULT_COLORS;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 130, damping: 22 }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 320, damping: 24 } }}
      className="h-full"
    >
      <Card className={cn(
        'group relative h-full overflow-hidden ease-snappy',
        'glass-subtle card-hover',
        'border-2 shadow-lg hover:shadow-xl',
        c.border,
      )}>
        {/* Subtle top inner highlight replacing flat gradient */}
        <div className={cn('absolute inset-x-0 top-0 h-1 mix-blend-overlay opacity-70 bg-gradient-to-r from-transparent via-primary to-transparent')} />

        {/* Sophisticated background radial glow on hover */}
        <div className={cn('pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700', c.bg)} />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
          <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {title}
          </CardTitle>
          {/* Icon box — consistent size, shape, and tint */}
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl glass-subtle shadow-sm',
            c.border
          )}>
            <Icon className={cn('h-[18px] w-[18px]', c.text)} />
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-0 relative">
          <div className="font-headline text-[2.2rem] font-black leading-none tabular-nums tracking-tight" ref={ref} />

          <div className="mt-3 flex items-end justify-between">
            <p className="text-xs text-muted-foreground/80">
              <span className={cn('mr-1 font-semibold', isPositive ? 'text-emerald-400' : 'text-muted-foreground')}>
                {trend}
              </span>
              {trendLabel}
            </p>
            {/* Minimalist sparkline */}
            <div className="h-6 w-16 opacity-60">
              <svg viewBox="0 0 100 24" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                <motion.path
                  d={isPositive ? "M0,20 Q20,18 35,10 T70,12 T100,2" : "M0,12 L100,12"}
                  fill="none"
                  className={c.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
StatCard.displayName = 'StatCard';

/* ── Exchange Card ───────────────────────────────────────────────────── */
function ExchangeCard({ exchange, currentUserId }: { exchange: Exchange; currentUserId: string }) {
  const isRequester = exchange.requester.id === currentUserId;
  const partner = isRequester ? exchange.receiver : exchange.requester;
  const mySkill = isRequester ? exchange.offeredSkill : exchange.wantedSkill;
  const theirSkill = isRequester ? exchange.wantedSkill : exchange.offeredSkill;
  const { toast } = useToast();
  const navigate = useNavigate();
  // Normalize to lowercase so comparisons work regardless of backend casing
  const [localStatus, setLocalStatus] = React.useState(exchange.status?.toLowerCase() ?? 'pending');
  const [dismissed, setDismissed] = React.useState(false);
  const [declineConfirmOpen, setDeclineConfirmOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [scheduledConfirmed, setScheduledConfirmed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
      className="h-full"
    >
      <Card className="group h-full overflow-hidden ease-snappy glass-subtle card-hover border-2 shadow-lg hover:shadow-xl hover:border-primary/40 transition-all duration-300">
        {/* Animated sheen line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-5">
          {/* Partner row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-border group-hover:ring-primary/50 transition-all shadow-sm">
                <AvatarImage src={partner.avatar ?? undefined} />
                <AvatarFallback className="text-sm font-bold">{partner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm leading-tight">{partner.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{partner.university ?? 'University'}</p>
              </div>
            </div>
            <Badge
              variant={localStatus === 'accepted' ? 'default' : 'secondary'}
              className="text-[10px] capitalize rounded-full px-2.5 py-0.5"
            >
              {localStatus}
            </Badge>
          </div>

          {/* Skill swap */}
          <div className="mt-4 space-y-2">
            {mySkill && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 border-2 border-primary/30 px-3 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-primary shrink-0 shadow-glow-sm" />
                <span className="text-[11px] font-semibold text-primary">You teach</span>
                <span className="ml-auto text-[11px] font-bold text-foreground truncate">{mySkill.name}</span>
              </div>
            )}
            {theirSkill && (
              <div className="flex items-center gap-2 rounded-xl bg-secondary/10 border-2 border-secondary/30 px-3 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-secondary shrink-0 shadow-glow-sm" />
                <span className="text-[11px] font-semibold text-secondary">{partner.name.split(' ')[0]} teaches</span>
                <span className="ml-auto text-[11px] font-bold text-foreground truncate">{theirSkill.name}</span>
              </div>
            )}
          </div>

          {exchange.sessionDate && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {new Date(exchange.sessionDate).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {localStatus === 'pending' && exchange.receiver.id === currentUserId ? (
              <>
                <Button variant="outline" size="sm" className="rounded-xl text-xs border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => setDeclineConfirmOpen(true)}>
                  Decline
                </Button>
                <Button size="sm" className="rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white" onClick={async () => {
                  try {
                    await exchangeService.updateStatus(exchange.id, 'accepted');
                    setLocalStatus('accepted');
                    toast({ title: 'Request accepted!', description: `You are now matched with ${partner.name.split(' ')[0]}.`, variant: 'success' });
                  } catch {
                    toast({ title: 'Failed to accept', description: 'Please try again.', variant: 'destructive' });
                  }
                }}>
                  Accept
                </Button>
              </>
            ) : localStatus === 'pending' ? (
              <>
                <Button variant="outline" size="sm" className="rounded-xl text-xs col-span-2 text-muted-foreground" disabled>
                  Waiting for response...
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => { navigate('/community'); toast({ title: 'Opening Community', description: 'Use Community to chat with your exchange partner.' }); }}>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />Message
                </Button>
                <Button size="sm" className="rounded-xl text-xs font-bold" onClick={() => setScheduleOpen(true)}>
                  <Video className="mr-1.5 h-3.5 w-3.5" />Schedule
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card >
      <ConfirmDialog
        open={declineConfirmOpen}
        onOpenChange={setDeclineConfirmOpen}
        title={`Decline ${partner.name.split(' ')[0]}'s request?`}
        description="They won't be notified, but they'll no longer see their request as pending."
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

      {/* ── Schedule Session Dialog ── */}
      <Dialog open={scheduleOpen} onOpenChange={(o) => { setScheduleOpen(o); if (!o) { setScheduleDate(''); setScheduleTime(''); setSessionNotes(''); setScheduledConfirmed(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline">
              <CalendarDays className="h-5 w-5 text-primary" />
              {scheduledConfirmed ? 'Session Scheduled!' : 'Schedule a Session'}
            </DialogTitle>
            <DialogDescription>
              {scheduledConfirmed
                ? `Your session with ${partner?.name?.split(' ')[0]} is confirmed.`
                : `Pick a date and time to meet with ${partner?.name?.split(' ')[0]}.`}
            </DialogDescription>
          </DialogHeader>

          {scheduledConfirmed ? (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="h-16 w-16 rounded-full bg-green-500/15 flex items-center justify-center"
              >
                <CheckCircle className="h-8 w-8 text-green-500" />
              </motion.div>
              <div>
                <p className="text-lg font-bold">{scheduleDate} at {scheduleTime}</p>
                {sessionNotes && <p className="text-sm text-muted-foreground mt-1">"{sessionNotes}"</p>}
              </div>
              <p className="text-sm text-muted-foreground">
                You'll both receive a reminder before the session.
              </p>
              <Button className="w-full" onClick={() => setScheduleOpen(false)}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="session-date">Date</Label>
                    <Input
                      id="session-date"
                      type="date"
                      value={scheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="session-time">Time</Label>
                    <Input
                      id="session-time"
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="session-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea
                    id="session-notes"
                    placeholder="Topics to cover, meeting link, etc."
                    value={sessionNotes}
                    onChange={e => setSessionNotes(e.target.value)}
                    rows={2}
                    className="rounded-xl resize-none text-sm"
                  />
                </div>
                <div className="rounded-xl p-3 bg-muted/50 border-2 border-border/60 flex items-start gap-2.5 shadow-sm">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={partner?.avatar ?? undefined} />
                    <AvatarFallback className="text-xs">{partner?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{partner?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mySkill && theirSkill
                        ? `You teach ${mySkill.name} · They teach ${theirSkill.name}`
                        : 'Skill exchange partner'}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                <Button
                  disabled={!scheduleDate || !scheduleTime}
                  onClick={() => setScheduledConfirmed(true)}
                >
                  <CalendarDays className="mr-2 h-4 w-4" /> Confirm Session
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </motion.div >
  );
}

/* ── Empty / Skeleton states ─────────────────────────────────────────── */
function EmptyExchanges() {
  return (
      <Card className="relative overflow-hidden border-dashed border-2 border-border bg-background/70 dark:bg-background/60 shadow-lg group">
        {/* Decorative background blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none transition-transform duration-1000 group-hover:scale-150" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-[40px] pointer-events-none" />
        
        <CardContent className="relative z-10 flex flex-col items-center justify-center py-16 text-center">
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, -5, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-glow-sm relative ring-1 ring-primary/20 backdrop-blur-md"
          >
            <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
            <Inbox className="h-10 w-10 text-primary relative z-10" />
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute -top-2 -right-2 h-6 w-6 bg-secondary rounded-full flex items-center justify-center border-2 border-background shadow-lg"
            >
              <Zap className="h-3 w-3 text-secondary-foreground" />
            </motion.div>
          </motion.div>
          <h3 className="font-bold text-lg text-foreground tracking-tight">No active exchanges yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-[28ch] leading-relaxed">
            Your knowledge journey begins here. Find a match, send a request, and start teaching!
          </p>
          <Button asChild className="mt-8 rounded-xl font-semibold shadow-glow-sm hover:shadow-glow transition-all duration-300" size="default">
            <Link to="/match">
              <Search className="mr-2 h-4 w-4" />
              Explore Marketplace
            </Link>
          </Button>
        </CardContent>
    </Card>
  );
}

function ExchangeSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 rounded-xl" />
          <Skeleton className="h-8 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function activityFromExchange(exchange: Exchange, currentUserId: string) {
  const partner = exchange.requester.id === currentUserId ? exchange.receiver : exchange.requester;
  const ms = Date.now() - new Date(exchange.createdAt).getTime();
  const mins = Math.round(ms / 60000);
  const timeLabel = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
  const status = exchange.status?.toLowerCase();

  switch (status) {
    case 'accepted':
      return { avatar: partner.avatar, name: partner.name, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', text: <><span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> accepted your request.</>, time: timeLabel };
    case 'pending':
      return exchange.requester.id === currentUserId
        ? { avatar: partner.avatar, name: partner.name, icon: Clock, color: 'text-primary', bg: 'bg-primary/10 text-primary border-primary/20', text: <>Waiting for <span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span>.</>, time: timeLabel }
        : { avatar: partner.avatar, name: partner.name, icon: Users, color: 'text-primary', bg: 'bg-primary/10 text-primary border-primary/20', text: <><span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> sent a request.</>, time: timeLabel };
    case 'completed':
      return { avatar: partner.avatar, name: partner.name, icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', text: <>Session with <span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> completed!</>, time: timeLabel };
    default:
      return null;
  }
}


/* ── Onboarding Progress ────────────────────────────────────────────────── */
function OnboardingProgress({ user, exchanges }: { user: any; exchanges: Exchange[] }) {
  const hasSkills = (user?.skillsOffered?.length ?? 0) > 0 || (user?.skillsWanted?.length ?? 0) > 0;
  const hasMatch = exchanges.length > 0;
  const hasSession = exchanges.some(e => e.status?.toLowerCase() === 'accepted' && e.sessionDate);

  const steps = [
    { title: "Add your skills", desc: "List what you can teach and what you want to learn.", done: hasSkills, link: '/settings?tab=skills' },
    { title: "Find a match", desc: "Send an exchange request to a fellow student.", done: hasMatch, link: '/match' },
    { title: "Schedule a session", desc: "Set a time to meet up and exchange knowledge.", done: hasSession, link: '/match' }
  ];

  const completed = steps.filter(s => s.done).length;
  if (completed === steps.length) return null; // hide entirely if done

  return (
    <ScrollReveal animation="zoom-in" delay={0.2} duration={0.6}>
      <Card className="overflow-hidden glass-subtle border-2 border-primary/30 bg-primary/10 shadow-lg">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div>
              <h3 className="font-headline font-bold text-lg text-primary">Let's get you set up!</h3>
              <p className="text-sm text-muted-foreground mt-1">Complete these steps to start your first skill exchange.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-primary">{Math.round((completed / steps.length) * 100)}% Complete</p>
                <p className="text-[10px] text-muted-foreground">{completed} of {steps.length} steps</p>
              </div>
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-primary/10" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-primary transition-all duration-1000 ease-out" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * completed / steps.length)} />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            {steps.map((step, i) => (
              <Link key={i} to={step.link} className={cn("block relative p-4 rounded-xl border-2 transition-all duration-300", step.done ? "bg-background/50 border-border opacity-60" : "bg-card border-primary/30 hover:border-primary hover:shadow-md shadow-sm")}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {step.done ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-primary" />}
                  </div>
                  <div>
                    <h4 className={cn("font-bold text-sm", step.done ? "line-through text-muted-foreground" : "text-foreground")}>{step.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{step.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}

/* ── Section heading ─────────────────────────────────────────────────── */
function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-headline text-xl font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { exchanges, loading } = useExchanges();
  const [serverStats, setServerStats] = React.useState<{ sessionsCompleted?: number; skillexScore?: number; activeExchanges?: number } | null>(null);

  React.useEffect(() => {
    DashboardService.getStats()
      .then((s) => setServerStats({
        sessionsCompleted: s.sessionsCompleted,
        skillexScore: s.skillexScore,
        activeExchanges: (s.activeExchanges ?? 0) + (s.pendingExchanges ?? 0),
      }))
      .catch(() => {}); // silently fall back to client-side values
  }, []);

  const currentUserId = user?.id ?? '';
  const activeExchanges = exchanges.filter(e => { const s = e.status?.toLowerCase(); return s === 'pending' || s === 'accepted'; });
  const upcomingSessions = exchanges.filter(e => e.status?.toLowerCase() === 'accepted' && e.sessionDate);
  const activityItems = exchanges.slice(0, 5).map(e => activityFromExchange(e, currentUserId)).filter(Boolean);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good morning', icon: '🌅' };
    if (h < 18) return { text: 'Good afternoon', icon: '☀️' };
    return { text: 'Good evening', icon: '🌙' };
  };
  const greeting = getGreeting();

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 22 } },
  };

  const stats: StatCardProps[] = [
    { icon: BookOpen, title: 'Skills Offered', value: user?.skillsOffered?.length ?? 0, trend: '+0', trendLabel: 'total', colorKey: 'primary', index: 0 },
    { icon: Users, title: 'Active Exchanges', value: serverStats?.activeExchanges ?? activeExchanges.length, trend: '+0', trendLabel: 'ongoing', colorKey: 'secondary', index: 1 },
    { icon: CheckCircle, title: 'Sessions Completed', value: serverStats?.sessionsCompleted ?? user?.sessionsCompleted ?? 0, trend: '+0', trendLabel: 'all time', colorKey: 'green', index: 2 },
    { icon: Star, title: 'SkillEx Score', value: serverStats?.skillexScore ?? user?.skillexScore ?? 0, trend: '+0', trendLabel: 'total', colorKey: 'accent', index: 3 },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 md:px-8 md:py-8 space-y-8">

        {/* ══ Hero Banner ══════════════════════════════════════════════ */}
        <ScrollReveal animation="fade-down" delay={0.1} duration={0.8}>
          <div className="relative overflow-hidden rounded-3xl glass-strong p-6 md:p-8 border-2 border-border shadow-xl">
            {/* Dynamic Background Image Sequence */}
            <motion.div
              className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-20 mix-blend-overlay"
              animate={{ scale: [1.02, 1.05, 1.02], rotate: [0, 0.5, 0], x: [0, -5, 0] }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
              <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover grayscale brightness-110 contrast-125 blur-sm" alt="Dashboard Abstract" />
            </motion.div>

            {/* Gradient mesh inside banner */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-background/60 to-secondary/10 dark:from-primary/20 dark:via-background/80 dark:to-accent/10 z-0" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_100%_0%,hsl(var(--secondary)/0.15),transparent)] z-0" />
            {/* Ambient blobs */}
            <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-primary/20 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-12 -right-8 h-52 w-52 rounded-full bg-primary/15 blur-[80px]" />
            {/* Decorative dots pattern top-right */}
            <div className="pointer-events-none absolute right-6 top-6 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px,transparent 1px)', backgroundSize: '12px 12px', width: 96, height: 72 }} />

            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                {/* Avatar with pulse ring */}
                <div className="relative hidden sm:block shrink-0">
                  <div className="absolute inset-[-4px] rounded-full bg-gradient-to-br from-primary via-primary/50 to-transparent opacity-70 animate-breathe" />
                  <Avatar className="relative h-16 w-16 ring-4 ring-card/80">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="text-xl font-black">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <motion.span
                    className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-background bg-primary shadow-glow-sm"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
                  />
                </div>

                <div>
                  <h1 className="font-headline text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">
                    {greeting.text},{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(185_100%_35%)]">
                      {user?.name?.split(' ')[0]}
                    </span>
                    {' '}
                    <motion.span
                      className="inline-block origin-[70%_70%]"
                      animate={{ rotate: [0, -14, 14, -8, 8, -4, 4, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                    >{greeting.icon}</motion.span>
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your SkillEx summary for today.</p>

                  {/* Mini stat pills */}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {[
                      { icon: BookOpen, label: `${user?.skillsOffered?.length ?? 0} skills`, cls: 'text-primary bg-primary/15 border-2 border-primary/40 shadow-sm' },
                      { icon: Users, label: `${activeExchanges.length} active`, cls: 'text-primary bg-primary/15 border-2 border-primary/40 shadow-sm' },
                      { icon: Star, label: `${user?.skillexScore ?? 0} pts`, cls: 'text-amber-400 bg-amber-500/15 border-2 border-amber-500/40 shadow-glow-sm' },
                      { icon: CheckCircle, label: `${user?.sessionsCompleted ?? 0} done`, cls: 'text-emerald-400 bg-emerald-500/15 border-2 border-emerald-500/40 shadow-sm' },
                    ].map(({ icon: IC, label, cls }) => (
                      <span key={label} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', cls)}>
                        <IC className="h-3 w-3" />{label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link to="/match"><Search className="mr-2 h-3.5 w-3.5" />Find a Match</Link>
                </Button>
                <Button asChild size="sm" className="rounded-xl font-bold">
                  <Link to={user?.id ? `/profile/${user.id}` : '/settings'}><TrendingUp className="mr-2 h-3.5 w-3.5" />My Progress</Link>
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ══ Onboarding Checklist ═══════════════════════════════════════ */}
        {!loading && user && (
          <OnboardingProgress user={user} exchanges={exchanges} />
        )}

        {/* ══ Stat Cards ═══════════════════════════════════════════════ */}
        <ScrollRevealGroup
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          animation="jitter-scale"
          staggerChildren={0.1}
          delay={0.15}
        >
          {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
        </ScrollRevealGroup>

        {/* ══ Main grid ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">

            {/* Active Exchanges */}
            <ScrollReveal animation="fade-up" delay={0.2}>
              <SectionHeading action={
                <Button variant="link" size="sm" asChild className="text-xs">
                  <Link to="/match">Find More <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              }>
                Active Exchanges
              </SectionHeading>
              {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><ExchangeSkeleton /><ExchangeSkeleton /></div>
              ) : activeExchanges.length === 0 ? (
                <EmptyExchanges />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {activeExchanges.slice(0, 4).map(ex => (
                    <ExchangeCard key={ex.id} exchange={ex} currentUserId={currentUserId} />
                  ))}
                </div>
              )}
            </ScrollReveal>

            {/* Upcoming Sessions */}
            <ScrollReveal animation="fade-up" delay={0.3}>
              <SectionHeading>Upcoming Sessions</SectionHeading>
              <Card className="border-2 shadow-lg">
                <CardContent className="p-5">
                  {loading ? (
                    <div className="space-y-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div>
                        </div>
                      ))}
                    </div>
                  ) : upcomingSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border-2 border-border shadow-sm">
                        <Clock className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      <p className="font-semibold text-sm">No sessions scheduled</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[22ch]">Accept an exchange and schedule your first session!</p>
                      <Button asChild size="sm" variant="outline" className="mt-4 rounded-xl">
                        <Link to="/match">Find Matches</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="relative space-y-5">
                      <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
                      {upcomingSessions.slice(0, 3).map((exchange, i) => {
                        const partner = exchange.requester.id === currentUserId ? exchange.receiver : exchange.requester;
                        const skill = exchange.offeredSkill ?? exchange.wantedSkill;
                        return (
                          <div key={exchange.id} className="relative flex items-center gap-4">
                            <div className={cn(
                              'absolute left-0 h-[18px] w-[18px] rounded-full border-2 border-background flex items-center justify-center shrink-0',
                              i === 0 ? 'bg-amber-400/20 border-amber-500/30' : 'bg-primary/20 border-primary/30'
                            )}>
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            </div>
                            <div className="pl-8 flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={partner.avatar ?? undefined} />
                                <AvatarFallback className="text-xs font-bold">{partner.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{skill?.name ?? 'Skill Exchange'} <span className="font-normal text-muted-foreground">with</span> {partner.name.split(' ')[0]}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {exchange.sessionDate
                                    ? new Date(exchange.sessionDate).toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' })
                                    : 'Date TBD'}
                                </p>
                              </div>
                            </div>
                            {i === 0 && (
                              <Button size="sm" className="rounded-xl text-xs font-bold shrink-0">
                                Join Now
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>

          {/* Right column */}
          <div className="space-y-6 lg:col-span-1">
            <div className="sticky top-[88px] space-y-6">

              {/* Your Skills */}
              <ScrollReveal animation="fade-left" delay={0.4}>
                <SectionHeading>Your Skills</SectionHeading>
                <Card className="overflow-hidden glass-subtle border-2 border-border shadow-lg">
                  {/* Teaching section */}
                  <div className="border-b-2 border-border p-5">
                    <p className="flex items-center gap-2 text-sm font-bold mb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 border-2 border-primary/30 shadow-sm">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                      </span>
                      Teaching
                    </p>
                    {!user ? (
                      <div className="flex flex-wrap gap-1.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
                    ) : (user.skillsOffered ?? []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border bg-muted/20 text-center shadow-sm">
                          <p className="text-xs text-muted-foreground mb-2">No skills added yet.</p>
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] rounded-lg">
                            <Link to={`/profile/${user?.id}`} className="text-primary hover:text-primary">Add skills to teach</Link>
                          </Button>
                        </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(user.skillsOffered ?? []).slice(0, 5).map((skill: Skill) => (
                          <div key={skill.id} className="inline-flex items-center rounded-full bg-primary/15 border-2 border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                            {skill.name}
                          </div>
                        ))}
                        {(user.skillsOffered ?? []).length > 5 && (
                          <div className="inline-flex items-center rounded-full bg-muted/50 border-2 border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            +{(user.skillsOffered ?? []).length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Learning section */}
                  <div className="p-5">
                    <p className="flex items-center gap-2 text-sm font-bold mb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 border-2 border-primary/30 shadow-sm">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </span>
                      Learning
                    </p>
                    {!user ? (
                      <div className="flex flex-wrap gap-1.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
                    ) : (user.skillsWanted ?? []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border bg-muted/20 text-center shadow-sm">
                          <p className="text-xs text-muted-foreground">You haven't listed what you want to learn.</p>
                        </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(user.skillsWanted ?? []).slice(0, 5).map((skill: Skill) => (
                          <div key={skill.id} className="inline-flex items-center rounded-full bg-primary/10 border-2 border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                            {skill.name}
                          </div>
                        ))}
                        {(user.skillsWanted ?? []).length > 5 && (
                          <div className="inline-flex items-center rounded-full bg-muted/50 border-2 border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            +{(user.skillsWanted ?? []).length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                    <Button asChild variant="outline" size="sm" className="mt-5 w-full rounded-xl text-xs border-border bg-background shadow-none hover:bg-muted">
                      <Link to={`/profile/${user?.id}`}>Edit Skills <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                </Card>
              </ScrollReveal>

              {/* Live Network Activity Feed */}
              <ScrollReveal animation="fade-left" delay={0.5}>
                <SectionHeading>
                  <span className="flex items-center gap-2">
                    Live Network
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </span>
                </SectionHeading>

                <Card className="glass-subtle border-2 border-border shadow-lg">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {activityItems.length > 0 ? (
                        activityItems.map((item, i) => (
                          item ? (
                            <div key={i} className="group relative flex items-start gap-3 rounded-xl p-2.5 transition-all hover:bg-muted/70 hover:shadow-sm dark:hover:bg-white/5 cursor-default border-2 border-transparent hover:border-border/60">
                              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-2 ring-border shadow-sm">
                                {item.avatar ? (
                                  <img src={item.avatar} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                  <div className={cn('flex h-full w-full flex-col items-center justify-center bg-background', item.bg)}>
                                    <span className="text-xs font-bold text-primary">{item.name?.charAt(0)}</span>
                                  </div>
                                )}
                                {/* Tiny bottom-right badge for status */}
                                <div className={cn('absolute -bottom-0.5 -right-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-background bg-background', item.bg)}>
                                  {item.icon && <item.icon className="h-2.5 w-2.5 drop-shadow-md" />}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center pt-0.5">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {item.text}
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground/60">{item.time}</p>
                              </div>
                            </div>
                          ) : null
                        ))
                      ) : (
                        <div className="text-center py-10 flex flex-col items-center justify-center relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30 shadow-sm">
                          <motion.div
                            animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"
                          >
                            <Sparkles className="h-5 w-5 text-primary" />
                          </motion.div>
                          <p className="font-semibold text-sm">Quiet Network</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-[20ch]">
                            No recent activity yet. When users match and learn, it will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
