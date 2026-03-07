
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
import { Link, useNavigate } from 'react-router-dom';
import { useCounter } from '@/hooks/useCounter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import type { Skill } from '@/types';

/* ── Consistent color palette for stat cards (Glassmorphism) ────────── */
const STAT_COLORS = {
  primary: { text: 'text-primary', bg: 'bg-primary/5 dark:bg-primary/10', border: 'border-primary/20 hover:border-primary/50', ring: 'shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]', stroke: 'stroke-primary' },
  secondary: { text: 'text-primary', bg: 'bg-primary/5 dark:bg-primary/10', border: 'border-primary/20 hover:border-primary/50', ring: 'shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]', stroke: 'stroke-primary' },
  green: { text: 'text-emerald-400', bg: 'bg-emerald-500/5 dark:bg-emerald-500/10', border: 'border-emerald-500/20 hover:border-emerald-500/50', ring: 'shadow-[0_0_0_1px_hsl(152_69%_31%/0.2)]', stroke: 'stroke-emerald-400' },
  accent: { text: 'text-amber-400', bg: 'bg-amber-500/5 dark:bg-amber-500/10', border: 'border-amber-500/20 hover:border-amber-500/50', ring: 'shadow-[0_0_0_1px_hsl(38_92%_50%/0.2)]', stroke: 'stroke-amber-400' },
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
  const partner = exchange.requester_id === currentUserId ? exchange.receiver : exchange.requester;
  const mySkill = exchange.requester_id === currentUserId ? exchange.offered_skill : exchange.wanted_skill;
  const theirSkill = exchange.requester_id === currentUserId ? exchange.wanted_skill : exchange.offered_skill;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [localStatus, setLocalStatus] = React.useState(exchange.status);
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
      className="h-full"
    >
      <Card className="group h-full overflow-hidden ease-snappy glass-subtle card-hover">
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
              variant={localStatus === 'accepted' ? 'default' : 'secondary'}
              className="text-[10px] capitalize rounded-full px-2.5 py-0.5"
            >
              {localStatus}
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
            {localStatus === 'pending' && exchange.receiver_id === currentUserId ? (
              <>
                <Button variant="outline" size="sm" className="rounded-xl text-xs border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => { setDismissed(true); toast({ title: 'Request declined', variant: 'destructive' }); }}>
                  Decline
                </Button>
                <Button size="sm" className="rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setLocalStatus('accepted'); toast({ title: 'Request accepted!', description: `You are now matched with ${partner.name.split(' ')[0]}.`, variant: 'success' }); }}>
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
                <Button size="sm" className="rounded-xl text-xs font-bold" onClick={() => toast({ title: 'Coming soon', description: 'Session scheduling will be available in a future update.' })}>
                  <Video className="mr-1.5 h-3.5 w-3.5" />Schedule
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card >
    </motion.div >
  );
}

/* ── Empty / Skeleton states ─────────────────────────────────────────── */
function EmptyExchanges() {
  return (
    <Card className="border-dashed border-2 border-border/60 bg-transparent shadow-none">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass-subtle shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)] relative"
        >
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
          <Inbox className="h-7 w-7 text-primary relative z-10" />
        </motion.div>
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
      return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', text: <><span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> accepted your request.</>, time: timeLabel };
    case 'pending':
      return exchange.requester_id === currentUserId
        ? { icon: Clock, color: 'text-primary', bg: 'bg-primary/10', text: <>Waiting for <span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span>.</>, time: timeLabel }
        : { icon: Users, color: 'text-primary', bg: 'bg-primary/10', text: <><span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> sent a request.</>, time: timeLabel };
    case 'completed':
      return { icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10', text: <>Session with <span className="font-bold text-foreground">{partner.name.split(' ')[0]}</span> completed!</>, time: timeLabel };
    default:
      return null;
  }
}


/* ── Onboarding Progress ────────────────────────────────────────────────── */
function OnboardingProgress({ user, exchanges }: { user: any; exchanges: Exchange[] }) {
  const hasSkills = (user?.skillsOffered?.length ?? 0) > 0 || (user?.skillsWanted?.length ?? 0) > 0;
  const hasMatch = exchanges.length > 0;
  const hasSession = exchanges.some(e => e.status === 'accepted' && e.session_date);

  const steps = [
    { title: "Add your skills", desc: "List what you can teach and what you want to learn.", done: hasSkills, link: `/profile/${user?.id}` },
    { title: "Find a match", desc: "Send an exchange request to a fellow student.", done: hasMatch, link: '/match' },
    { title: "Schedule a session", desc: "Set a time to meet up and exchange knowledge.", done: hasSession, link: '/match' }
  ];

  const completed = steps.filter(s => s.done).length;
  if (completed === steps.length) return null; // hide entirely if done

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}>
      <Card className="overflow-hidden glass-subtle border-primary/20 bg-primary/5">
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
              <Link key={i} to={step.link} className={cn("block relative p-4 rounded-xl border transition-all duration-300", step.done ? "bg-background/50 border-border/50 opacity-60" : "bg-card border-primary/20 hover:border-primary/50 shadow-sm")}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {step.done ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-primary/50" />}
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
    </motion.div>
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

  const currentUserId = user?.id ?? '';
  const activeExchanges = exchanges.filter(e => e.status === 'pending' || e.status === 'accepted');
  const upcomingSessions = exchanges.filter(e => e.status === 'accepted' && e.session_date);
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
          <div className="relative overflow-hidden rounded-3xl glass-strong p-6 md:p-8 border border-white/5 dark:border-white/10 shadow-glow-sm">
            {/* Gradient mesh inside banner - Teal & Blue */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-primary/5" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,hsl(var(--primary)/0.15),hsl(var(--primary)/0.04))]" />
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
                      { icon: BookOpen, label: `${user?.skillsOffered?.length ?? 0} skills`, cls: 'text-primary bg-primary/10 border-primary/20' },
                      { icon: Users, label: `${activeExchanges.length} active`, cls: 'text-primary bg-primary/10 border-primary/20' },
                      { icon: Star, label: `${user?.skillexScore ?? 0} pts`, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-glow-sm' },
                      { icon: CheckCircle, label: `${user?.sessionsCompleted ?? 0} done`, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
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
                  <Link to={user?.id ? `/profile/${user.id}` : '/settings'}><TrendingUp className="mr-2 h-3.5 w-3.5" />My Progress</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══ Onboarding Checklist ═══════════════════════════════════════ */}
        {!loading && user && (
          <OnboardingProgress user={user} exchanges={exchanges} />
        )}

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
                      <Button asChild size="sm" variant="outline" className="mt-4 rounded-xl">
                        <Link to="/match">Find Matches</Link>
                      </Button>
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
            <div className="sticky top-[88px] space-y-6">

              {/* Your Skills */}
              <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
                <SectionHeading>Your Skills</SectionHeading>
                <Card className="overflow-hidden glass-subtle border-border/40">
                  {/* Teaching section */}
                  <div className="border-b border-border/40 p-5">
                    <p className="flex items-center gap-2 text-sm font-bold mb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                      </span>
                      Teaching
                    </p>
                    {!user ? (
                      <div className="flex flex-wrap gap-1.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
                    ) : (user.skillsOffered ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No skills added. <Link to={`/profile/${user?.id}`} className="text-primary hover:underline font-medium">Add them →</Link></p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(user.skillsOffered ?? []).slice(0, 5).map((skill: Skill) => (
                          <div key={skill.id} className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary shadow-glow-sm">
                            {skill.name}
                          </div>
                        ))}
                        {(user.skillsOffered ?? []).length > 5 && (
                          <div className="inline-flex items-center rounded-full bg-muted/50 border border-border/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            +{(user.skillsOffered ?? []).length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Learning section */}
                  <div className="p-5">
                    <p className="flex items-center gap-2 text-sm font-bold mb-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </span>
                      Learning
                    </p>
                    {!user ? (
                      <div className="flex flex-wrap gap-1.5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
                    ) : (user.skillsWanted ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No skills added yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(user.skillsWanted ?? []).slice(0, 5).map((skill: Skill) => (
                          <div key={skill.id} className="inline-flex items-center rounded-full bg-primary/5 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
                            {skill.name}
                          </div>
                        ))}
                        {(user.skillsWanted ?? []).length > 5 && (
                          <div className="inline-flex items-center rounded-full bg-muted/50 border border-border/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            +{(user.skillsWanted ?? []).length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                    <Button asChild variant="outline" size="sm" className="mt-5 w-full rounded-xl text-xs border-white/5 bg-background shadow-none hover:bg-background/80">
                      <Link to={`/profile/${user?.id}`}>Edit Skills <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>

              {/* Live Network Activity Feed */}
              <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.28 }}>
                <SectionHeading>
                  <span className="flex items-center gap-2">
                    Live Network
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </span>
                </SectionHeading>

                <Card className="glass-subtle border-border/40">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {activityItems.length > 0 ? (
                        activityItems.map((item, i) => (
                          item ? (
                            <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/5 dark:hover:bg-white/5">
                              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl md:shadow-glow-sm', item.bg)}>
                                {item.icon && <item.icon className={cn('h-3.5 w-3.5', item.color)} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {item.text}
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground/60">{item.time}</p>
                              </div>
                            </div>
                          ) : null
                        ))
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          No recent activity yet.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
