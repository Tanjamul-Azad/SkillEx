
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useExchanges } from '@/hooks/useExchanges';
import type { Exchange } from '@/services/exchangeService';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
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
import { Link } from 'react-router-dom';
import { useCounter } from '@/hooks/useCounter';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { Skill } from '@/types';

/* ── Consistent color palette for stat cards (Glassmorphism) ────────── */
interface StatColors {
  text: string;
  bg: string;
  border: string;
  ring: string;
}
const STAT_COLORS: Record<string, StatColors> = {
  primary: { text: 'text-primary', bg: 'bg-primary/5 dark:bg-primary/10', border: 'border-primary/20', ring: 'shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]' },
  secondary: { text: 'text-secondary', bg: 'bg-secondary/5 dark:bg-secondary/10', border: 'border-secondary/20', ring: 'shadow-[0_0_0_1px_hsl(var(--secondary)/0.2)]' },
  green: { text: 'text-emerald-500', bg: 'bg-emerald-500/5 dark:bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'shadow-[0_0_0_1px_hsl(152_69%_31%/0.2)]' },
  accent: { text: 'text-amber-500', bg: 'bg-amber-500/5 dark:bg-amber-500/10', border: 'border-amber-500/20', ring: 'shadow-[0_0_0_1px_hsl(38_92%_50%/0.2)]' },
};

interface StatCardProps {
  icon: React.ElementType;
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
  const c = STAT_COLORS[colorKey];
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 130, damping: 22 }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 320, damping: 24 } }}
      className="h-full"
    >
      <Card className={cn(
        'group relative h-full overflow-hidden transition-all duration-400 ease-snappy',
        'hover:shadow-[0_8px_30px_hsl(0_0%_0%/0.10),0_2px_8px_hsl(0_0%_0%/0.06)] hover:-translate-y-1.5',
        'glass-subtle hover:glass-strong',
        c.border,
      )}>
        {/* Subtle top inner highlight replacing flat gradient */}
        <div className={cn('absolute inset-x-0 top-0 h-px mix-blend-overlay opacity-50 bg-white dark:bg-white/20')} />

        {/* Sophisticated background radial glow on hover */}
        <div className={cn('pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700', c.bg)} />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
          <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {title}
          </CardTitle>
          {/* Icon box — consistent size, shape, and tint */}
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl glass-subtle',
            c.border
          )}>
            <Icon className={cn('h-[18px] w-[18px]', c.text)} />
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-0">
          <div className="font-headline text-[2.2rem] font-black leading-none tabular-nums tracking-tight" ref={ref} />
          <p className="mt-2 text-xs text-muted-foreground/80">
            <span className={cn('mr-1 font-semibold', isPositive ? 'text-emerald-500' : 'text-destructive')}>
              {trend}
            </span>
            {trendLabel}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
});
StatCard.displayName = 'StatCard';

/* ── Exchange Card ───────────────────────────────────────────────────── */
function ExchangeCard({ exchange, currentUserId }: { exchange: Exchange; currentUserId: string }) {
  const partner = exchange.requester_id === currentUserId ? exchange.receiver : exchange.requester;
  const mySkill = exchange.requester_id === currentUserId ? exchange.offered_skill : exchange.wanted_skill;
  const theirSkill = exchange.requester_id === currentUserId ? exchange.wanted_skill : exchange.offered_skill;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
      className="h-full"
    >
      <Card className="group h-full overflow-hidden transition-all duration-400 ease-snappy hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25),0_4px_12px_hsl(220_20%_40%/0.1)]">
        {/* Animated sheen line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-5">
          {/* Partner row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-border group-hover:ring-primary/30 transition-all">
                <AvatarImage src={partner.avatar ?? undefined} />
                <AvatarFallback className="text-sm font-bold">{partner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm leading-tight">{partner.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{partner.university ?? 'University'}</p>
              </div>
            </div>
            <Badge
              variant={exchange.status === 'accepted' ? 'default' : 'secondary'}
              className="text-[10px] capitalize rounded-full px-2.5 py-0.5"
            >
              {exchange.status}
            </Badge>
          </div>

          {/* Skill swap */}
          <div className="mt-4 space-y-2">
            {mySkill && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/12 px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-[11px] font-semibold text-primary/80">You teach</span>
                <span className="ml-auto text-[11px] font-bold text-foreground truncate">{mySkill.name}</span>
              </div>
            )}
            {theirSkill && (
              <div className="flex items-center gap-2 rounded-xl bg-secondary/5 border border-secondary/12 px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                <span className="text-[11px] font-semibold text-secondary/80">{partner.name.split(' ')[0]} teaches</span>
                <span className="ml-auto text-[11px] font-bold text-foreground truncate">{theirSkill.name}</span>
              </div>
            )}
          </div>

          {exchange.session_date && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {new Date(exchange.session_date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-xs">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />Message
            </Button>
            <Button size="sm" className="rounded-xl text-xs font-bold">
              <Video className="mr-1.5 h-3.5 w-3.5" />Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Empty / Skeleton states ─────────────────────────────────────────── */
function EmptyExchanges() {
  return (
    <Card className="border-dashed border-2 border-border/60 bg-transparent shadow-none">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass-subtle shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]">
          <Inbox className="h-7 w-7 text-primary" />
        </div>
        <p className="font-bold text-base">No active exchanges yet</p>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-[22ch] leading-relaxed">
          Find a match, send a request, and start teaching!
        </p>
        <Button asChild className="mt-6 rounded-xl font-bold" size="sm">
          <Link to="/match"><Search className="mr-2 h-3.5 w-3.5" />Find a Match</Link>
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
  const partner = exchange.requester_id === currentUserId ? exchange.receiver : exchange.requester;
  const ms = Date.now() - new Date(exchange.updated_at).getTime();
  const mins = Math.round(ms / 60000);
  const timeLabel = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;

  switch (exchange.status) {
    case 'accepted':
      return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', text: <><span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> accepted your exchange request.</>, time: timeLabel };
    case 'pending':
      return exchange.requester_id === currentUserId
        ? { icon: Clock, color: 'text-primary', bg: 'bg-primary/10', text: <>Waiting for <span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> to respond.</>, time: timeLabel }
        : { icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', text: <><span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> sent you an exchange request.</>, time: timeLabel };
    case 'completed':
      return { icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10', text: <>Session with <span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> completed!</>, time: timeLabel };
    default:
      return null;
  }
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

  const currentUserId = user?.id ?? '';
  const activeExchanges = exchanges.filter(e => e.status === 'pending' || e.status === 'accepted');
  const upcomingSessions = exchanges.filter(e => e.status === 'accepted' && e.session_date);
  const activityItems = exchanges.slice(0, 5).map(e => activityFromExchange(e, currentUserId)).filter(Boolean);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 22 } },
  };

  const stats: StatCardProps[] = [
    { icon: BookOpen, title: 'Skills Offered', value: user?.skillsOffered.length ?? 0, trend: '+0', trendLabel: 'total', colorKey: 'primary', index: 0 },
    { icon: Users, title: 'Active Exchanges', value: activeExchanges.length, trend: '+0', trendLabel: 'ongoing', colorKey: 'secondary', index: 1 },
    { icon: CheckCircle, title: 'Sessions Completed', value: user?.sessionsCompleted ?? 0, trend: '+0', trendLabel: 'all time', colorKey: 'green', index: 2 },
    { icon: Star, title: 'SkillEx Score', value: user?.skillexScore ?? 0, trend: '+0', trendLabel: 'total', colorKey: 'accent', index: 3 },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 md:px-8 md:py-8 space-y-8">

        {/* ══ Hero Banner ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, type: 'spring', stiffness: 110, damping: 20 }}
        >
          <div className="relative overflow-hidden rounded-3xl glass-strong p-6 md:p-8">
            {/* Gradient mesh inside banner */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/6" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,hsl(var(--primary)/0.12),transparent)]" />
            {/* Ambient blobs */}
            <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-8 h-52 w-52 rounded-full bg-secondary/12 blur-3xl" />
            {/* Decorative dots pattern top-right */}
            <div className="pointer-events-none absolute right-6 top-6 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px,transparent 1px)', backgroundSize: '12px 12px', width: 96, height: 72 }} />

            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                {/* Avatar with pulse ring */}
                <div className="relative hidden sm:block shrink-0">
                  <div className="absolute inset-[-3px] rounded-full bg-gradient-to-br from-primary to-secondary opacity-60 animate-breathe" />
                  <Avatar className="relative h-16 w-16 ring-2 ring-background">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="text-xl font-black">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <motion.span
                    className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-background bg-secondary"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
                  />
                </div>

                <div>
                  <h1 className="font-headline text-2xl font-extrabold tracking-tight md:text-3xl">
                    {getGreeting()},{' '}
                    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {user?.name?.split(' ')[0]}
                    </span>
                    {' '}
                    <motion.span
                      className="inline-block origin-[70%_70%]"
                      animate={{ rotate: [0, -14, 14, -8, 8, -4, 4, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                    >👋</motion.span>
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your SkillEx summary for today.</p>

                  {/* Mini stat pills */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { icon: BookOpen, label: `${user?.skillsOffered.length ?? 0} skills`, cls: 'text-primary bg-primary/10 border-primary/20' },
                      { icon: Users, label: `${activeExchanges.length} active`, cls: 'text-secondary bg-secondary/10 border-secondary/20' },
                      { icon: Star, label: `${user?.skillexScore ?? 0} pts`, cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                      { icon: CheckCircle, label: `${user?.sessionsCompleted ?? 0} done`, cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                    ].map(({ icon: IC, label, cls }) => (
                      <span key={label} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', cls)}>
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
                  <Link to={`/profile/${user?.id}`}><TrendingUp className="mr-2 h-3.5 w-3.5" />My Progress</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══ Stat Cards ═══════════════════════════════════════════════ */}
        <motion.div
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          variants={containerVariants} initial="hidden" animate="visible"
        >
          {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
        </motion.div>

        {/* ══ Main grid ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">

            {/* Active Exchanges */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible">
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
            </motion.div>

            {/* Upcoming Sessions */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
              <SectionHeading>Upcoming Sessions</SectionHeading>
              <Card>
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
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                        <Clock className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      <p className="font-semibold text-sm">No sessions scheduled</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[22ch]">Accept an exchange and schedule your first session!</p>
                    </div>
                  ) : (
                    <div className="relative space-y-5">
                      <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
                      {upcomingSessions.slice(0, 3).map((exchange, i) => {
                        const partner = exchange.requester_id === currentUserId ? exchange.receiver : exchange.requester;
                        const skill = exchange.offered_skill ?? exchange.wanted_skill;
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
                                  {exchange.session_date
                                    ? new Date(exchange.session_date).toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' })
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
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-6 lg:col-span-1">

            {/* Your Skills */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
              <SectionHeading>Your Skills</SectionHeading>
              <Card className="overflow-hidden">
                {/* Teaching section */}
                <div className="border-b border-border/50 p-5">
                  <p className="flex items-center gap-2 text-sm font-bold mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </span>
                    Teaching
                  </p>
                  {!user ? (
                    <div className="flex flex-wrap gap-1.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
                  ) : user.skillsOffered.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No skills added. <Link to="/onboarding" className="text-primary hover:underline font-medium">Add them →</Link></p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {user.skillsOffered.map((skill: Skill) => (
                        <Badge key={skill.id} variant="secondary" className="rounded-full text-[11px] px-2.5">{skill.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {/* Learning section */}
                <div className="p-5">
                  <p className="flex items-center gap-2 text-sm font-bold mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary/10">
                      <BookOpen className="h-3.5 w-3.5 text-secondary" />
                    </span>
                    Learning
                  </p>
                  {!user ? (
                    <div className="flex flex-wrap gap-1.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
                  ) : user.skillsWanted.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No skills added yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {user.skillsWanted.map((skill: Skill) => (
                        <Badge key={skill.id} variant="outline" className="rounded-full text-[11px] px-2.5">{skill.name}</Badge>
                      ))}
                    </div>
                  )}
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full rounded-xl text-xs">
                    <Link to={`/profile/${user?.id}`}>Edit Skills <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Activity Feed */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.28 }}>
              <SectionHeading>
                <span className="flex items-center gap-2">
                  Activity Feed
                  <Sparkles className="h-4 w-4 text-amber-500/80" />
                </span>
              </SectionHeading>
              <Card>
                <CardContent className="p-5">
                  {loading ? (
                    <div className="space-y-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-start gap-3">
                          <Skeleton className="h-8 w-8 rounded-xl" />
                          <Skeleton className="h-10 flex-1 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : activityItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                        <TrendingUp className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      <p className="font-semibold text-sm">No activity yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Your exchange activity will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityItems.map((item, i) => {
                        if (!item) return null;
                        const Icon = item.icon;
                        return (
                          <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50">
                            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', item.bg)}>
                              <Icon className={cn('h-3.5 w-3.5', item.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground/60">{item.time}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
