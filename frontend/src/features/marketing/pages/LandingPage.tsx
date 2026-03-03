
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  Zap, Code, Film, Music, Figma, Camera, Mic, Database, ArrowRight,
  Pencil, Bot, RefreshCw, Star, Quote, Users, Sparkles, TrendingUp,
  Shield, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCounter } from '@/hooks/useCounter';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { skills, users } from '@data/mock/mockData';
import { cn } from '@/lib/utils';
import MarketingLayout from '@/components/layout/MarketingLayout';

/* ── Shared motion variants ─────────────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } },
};
const itemFast = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
};

/* ── Scroll-aware section wrapper ────────────────────────────────────────── */
const Section = React.memo(({ children, className, id }: {
  children: React.ReactNode; className?: string; id?: string;
}) => {
  const { ref, isInView } = useScrollAnimation();
  return (
    <motion.section
      ref={ref}
      id={id}
      variants={container}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={cn('w-full py-24 sm:py-32', className)}
    >
      {children}
    </motion.section>
  );
});
Section.displayName = 'Section';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <motion.div variants={item} className="flex items-center justify-center mb-4">
    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
      {children}
    </span>
  </motion.div>
);

const SectionTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.h2
    variants={item}
    className={cn(
      'text-4xl font-extrabold tracking-tight text-center font-headline md:text-5xl lg:text-6xl text-balance',
      className
    )}
  >
    {children}
  </motion.h2>
);

const GradientUnderline = () => (
  <motion.div
    variants={item}
    className="mx-auto mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
  />
);

/* ══════════════════════════════════════════════════════════════════════════════
   HERO SECTION
══════════════════════════════════════════════════════════════════════════════ */

// Left column: stacked on the far-left edge
// Right column: stacked on the far-right edge
// None are near the center content area (max-w-5xl)
const floatingSkillsData = [
  // ── Left column ──────────────────────────────────────────
  { name: 'Guitar', icon: Music, side: 'left', top: '12%', delay: 0, duration: 3.8 },
  { name: 'Photography', icon: Camera, side: 'left', top: '32%', delay: 0.6, duration: 4.2 },
  { name: 'Video Editing', icon: Film, side: 'left', top: '54%', delay: 1.2, duration: 3.5 },
  { name: 'Git & GitHub', icon: TrendingUp, side: 'left', top: '74%', delay: 1.8, duration: 4.6 },
  // ── Right column ─────────────────────────────────────────
  { name: 'Python', icon: Code, side: 'right', top: '18%', delay: 0.3, duration: 4.0 },
  { name: 'Data Science', icon: Database, side: 'right', top: '38%', delay: 0.9, duration: 3.6 },
  { name: 'Figma', icon: Figma, side: 'right', top: '58%', delay: 1.5, duration: 4.4 },
  { name: 'Public Speaking', icon: Mic, side: 'right', top: '76%', delay: 2.1, duration: 3.9 },
];

/* Bubble component with continuous floating animation */
const FloatingBubble = React.memo(({ skill }: {
  skill: typeof floatingSkillsData[0];
}) => {
  const posStyle: React.CSSProperties = {
    top: skill.top,
    ...(skill.side === 'left' ? { left: '1.5rem' } : { right: '1.5rem' }),
  };

  return (
    /* Outer: entry fade-in + scale */
    <motion.div
      className="absolute hidden xl:block"
      style={posStyle}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: skill.delay + 0.5, type: 'spring', stiffness: 180, damping: 18 }}
    >
      {/* Inner: continuous bubble float */}
      <motion.div
        className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2.5 text-sm font-medium shadow-lg cursor-default select-none"
        animate={{ y: [0, -10, 0], scale: [1, 1.03, 1] }}
        transition={{
          duration: skill.duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: skill.delay,
        }}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <skill.icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-foreground/80 whitespace-nowrap">{skill.name}</span>
      </motion.div>
    </motion.div>
  );
});
FloatingBubble.displayName = 'FloatingBubble';

const HeroSection = () => (
  <section
    className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background"
  >
    {/* Ambient blobs */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="animate-blob absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
      <div className="animate-blob absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/8 blur-[120px]" style={{ animationDelay: '4s', animationDuration: '16s' }} />
      <div className="animate-blob absolute -bottom-40 -right-40 h-[550px] w-[550px] rounded-full bg-accent/8 blur-[100px]" style={{ animationDelay: '8s' }} />
    </div>

    {/* Dot grid */}
    <div className="pointer-events-none absolute inset-0 dot-grid opacity-40 dark:opacity-20" />

    {/* Floating skill bubbles — left + right columns, never overlapping center */}
    {floatingSkillsData.map((skill) => (
      <FloatingBubble key={skill.name} skill={skill} />
    ))}

    {/* Main hero content */}
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center"
    >
      {/* Social proof pill */}
      <motion.div variants={item}>
        <Link to="/login" className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary transition-all hover:border-primary/40 hover:bg-primary/10">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Trusted by 12,000+ students · 150+ universities</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>

      {/* Headline */}
      <motion.h1
        variants={item}
        className="font-headline text-7xl font-extrabold tracking-tighter leading-[0.9] md:text-8xl lg:text-[7rem]"
      >
        <span className="block">Trade Skills.</span>
        <span className="block text-gradient-animated mt-1">Not Money.</span>
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        variants={item}
        className="max-w-xl text-lg text-muted-foreground text-balance leading-relaxed md:text-xl"
      >
        Connect with students who have what you want to learn — and teach what you know.
        No payments. Just pure knowledge exchange.
      </motion.p>

      {/* CTAs */}
      <motion.div variants={item} className="flex flex-col items-center gap-4 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="group h-14 rounded-2xl px-8 text-base font-bold gradient-bg text-primary-foreground shadow-glow transition-all hover:scale-105 hover:shadow-glow-lg"
        >
          <Link to="/login">
            Start Exchanging Free
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-14 rounded-2xl px-8 text-base font-semibold border-border/60 hover:border-primary/40 hover:bg-primary/5"
        >
          <Link to="#how-it-works">See how it works</Link>
        </Button>
      </motion.div>

      {/* Trust strip */}
      <motion.div variants={item} className="flex items-center gap-6 text-sm text-muted-foreground">
        {[
          { icon: Shield, text: 'No credit card' },
          { icon: Users, text: '8,500+ exchanges' },
          { icon: Star, text: '4.9 avg rating' },
        ].map(({ icon: Icon, text }) => (
          <span key={text} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-secondary" />
            {text}
          </span>
        ))}
      </motion.div>
    </motion.div>

    {/* Scroll indicator */}
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2, duration: 0.6 }}
    >
      <Link to="#how-it-works" className="flex flex-col items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <span>Scroll to explore</span>
        <motion.div
          className="h-8 w-5 rounded-full border-2 border-border flex items-start justify-center pt-1"
        >
          <motion.div
            className="h-1.5 w-1 rounded-full bg-muted-foreground"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </Link>
    </motion.div>
  </section>
);

/* ══════════════════════════════════════════════════════════════════════════════
   TICKER / MARQUEE
══════════════════════════════════════════════════════════════════════════════ */
const SkillTicker = () => {
  const skillNames = skills.map((s) => s.name);
  const doubled = [...skillNames, ...skillNames];
  return (
    <div className="relative w-full overflow-hidden border-y border-border bg-muted/30 py-4">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="flex animate-ticker gap-0 whitespace-nowrap" style={{ width: 'max-content' }}>
        {doubled.map((name, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 text-sm font-medium text-muted-foreground">
            <span className="text-primary/60">✦</span>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════════════════════════════════════════════ */
const HowItWorksSection = () => {
  const steps = [
    {
      step: '01',
      icon: Pencil,
      title: 'List your skill',
      description: "Tell us what you're great at. Add a description, your experience level, and what you'd love to learn in return.",
      color: 'from-blue-500/20 to-primary/10 border-primary/20',
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      step: '02',
      icon: Bot,
      title: 'AI finds your match',
      description: 'Our smart algorithm analyzes skill compatibility and learning goals to find your perfect exchange partner.',
      color: 'from-emerald-500/20 to-secondary/10 border-secondary/20',
      iconColor: 'text-secondary',
      iconBg: 'bg-secondary/10',
    },
    {
      step: '03',
      icon: RefreshCw,
      title: 'Start exchanging',
      description: 'Schedule sessions, meet on video, track your progress, and grow your skills — completely free.',
      color: 'from-amber-500/20 to-accent/10 border-accent/20',
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
    },
  ];

  return (
    <Section id="how-it-works">
      <div className="container mx-auto px-4">
        <SectionLabel><Bot className="h-3.5 w-3.5" /> How It Works</SectionLabel>
        <SectionTitle>
          Three steps to start{' '}
          <span className="text-gradient">learning</span>
        </SectionTitle>
        <GradientUnderline />

        <div className="relative mt-20 grid gap-8 md:grid-cols-3">
          {/* Connector line */}
          <svg className="pointer-events-none absolute top-16 left-0 hidden w-full md:block" height="2">
            <motion.line
              x1="20%"
              y1="1"
              x2="80%"
              y2="1"
              stroke="url(#stepGrad)"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.4, ease: 'easeInOut' }}
            />
            <defs>
              <linearGradient id="stepGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="50%" stopColor="hsl(var(--secondary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
          </svg>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={item}
              whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300 } }}
            >
              <div className={cn(
                'relative h-full rounded-3xl glass p-8 transition-all duration-400 ease-snappy hover:shadow-glow-sm hover:-translate-y-2 group overflow-hidden',
                step.color
              )}>
                <div className="absolute inset-0 bg-gradient-to-br opacity-5 transition-opacity group-hover:opacity-10 pointer-events-none" />
                <span className="absolute top-6 right-6 font-headline text-5xl font-black text-foreground/5">
                  {step.step}
                </span>
                <div className={cn('inline-flex h-14 w-14 items-center justify-center rounded-2xl', step.iconBg)}>
                  <step.icon className={cn('h-7 w-7', step.iconColor)} />
                </div>
                <h3 className="mt-6 text-xl font-bold font-headline">{step.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   SKILL CHAIN
══════════════════════════════════════════════════════════════════════════════ */
const SkillChainSection = () => {
  const chainMembers = [
    { user: users[0], teaches: 'Video Editing', learns: 'Guitar', angle: -90 },
    { user: users[1], teaches: 'Guitar', learns: 'Python', angle: 30 },
    { user: users[2], teaches: 'Python', learns: 'Video Editing', angle: 150 },
  ];
  const R = 140; // orbit radius
  const cx = 180; const cy = 200;

  return (
    <Section id="skill-chain" className="bg-muted/30 dark:bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left copy */}
          <div className="space-y-6">
            <SectionLabel><Zap className="h-3.5 w-3.5" /> Skill Chains</SectionLabel>
            <motion.h2 variants={item} className="font-headline text-4xl font-extrabold tracking-tight md:text-5xl text-balance">
              The magic of{' '}
              <span className="text-gradient">circular</span> learning
            </motion.h2>
            <motion.p variants={item} className="text-lg text-muted-foreground leading-relaxed">
              No one pays. Everyone gains. Join a Skill Chain where every member
              is both a teacher and a student — creating an unstoppable cycle of knowledge.
            </motion.p>
            <motion.ul variants={container} className="space-y-3">
              {[
                'Each person teaches one skill and learns another',
                'No direct exchange required between two people',
                'AI verifies chain balance and compatibility',
              ].map((point) => (
                <motion.li key={point} variants={itemFast} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    ✓
                  </span>
                  {point}
                </motion.li>
              ))}
            </motion.ul>
            <motion.div variants={item}>
              <Button asChild variant="outline" className="rounded-xl border-primary/30 hover:bg-primary/5 hover:border-primary/50">
                <Link to="/match">
                  Join a chain <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Right — SVG chain diagram */}
          <motion.div
            variants={item}
            className="relative flex items-center justify-center"
          >
            <svg viewBox="0 0 360 400" className="w-full max-w-sm" fill="none">
              {/* Orbit ring */}
              <motion.circle
                cx={cx} cy={cy} r={R}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="4 6"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              />
              {/* Connecting lines */}
              {chainMembers.map((_, i) => {
                const a0 = ((chainMembers[i].angle) * Math.PI) / 180;
                const a1 = ((chainMembers[(i + 1) % 3].angle) * Math.PI) / 180;
                const x0 = cx + R * Math.cos(a0);
                const y0 = cy + R * Math.sin(a0);
                const x1 = cx + R * Math.cos(a1);
                const y1 = cy + R * Math.sin(a1);
                return (
                  <motion.line
                    key={i}
                    x1={x0} y1={y0} x2={x1} y2={y1}
                    stroke="url(#chainGrad)"
                    strokeWidth="1.5"
                    strokeDasharray="240"
                    initial={{ strokeDashoffset: 240 }}
                    whileInView={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1.2, delay: 0.3 + i * 0.3 }}
                  />
                );
              })}
              <defs>
                <linearGradient id="chainGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>

              {/* Center badge */}
              <motion.circle
                cx={cx} cy={cy} r={36}
                fill="hsl(var(--primary) / 0.1)"
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="1"
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: 'spring' }}
              />
              <motion.text
                x={cx} y={cy + 5}
                textAnchor="middle"
                fontSize="11"
                fill="hsl(var(--primary))"
                fontWeight="700"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
              >
                Skill Chain
              </motion.text>

              {/* Member nodes */}
              {chainMembers.map((member, i) => {
                const a = (member.angle * Math.PI) / 180;
                const x = cx + R * Math.cos(a);
                const y = cy + R * Math.sin(a);
                return (
                  <motion.g
                    key={member.user.id}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 120 }}
                  >
                    <circle cx={x} cy={y} r={28} fill="hsl(var(--card))" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5" />
                    <image href={member.user.avatar} x={x - 22} y={y - 22} width="44" height="44" clipPath={`url(#clip${i})`} />
                    <clipPath id={`clip${i}`}>
                      <circle cx={x} cy={y} r={22} />
                    </clipPath>
                    {/* Label */}
                    <text x={x} y={y + 44} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontWeight="600">
                      {member.user.name.split(' ')[0]}
                    </text>
                    <text x={x} y={y + 57} textAnchor="middle" fontSize="9" fill="hsl(var(--primary))">
                      Teaches {member.teaches}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </motion.div>
        </div>
      </div>
    </Section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════════════════════════════════ */
const StatCounter = React.memo(({ value, label, suffix = '+', icon: Icon, color }: {
  value: number; label: string; suffix?: string;
  icon: React.ElementType; color: string;
}) => {
  const { ref } = useCounter(value, { duration: 2.5 });
  return (
    <motion.div variants={item} className="flex flex-col items-center gap-3 text-center">
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-baseline justify-center gap-0.5">
          <span ref={ref} className="font-headline text-5xl font-black tabular-nums" />
          <span className="font-headline text-4xl font-black text-primary">{suffix}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground font-medium">{label}</p>
      </div>
    </motion.div>
  );
});
StatCounter.displayName = 'StatCounter';

const StatsSection = () => (
  <Section>
    <div className="container mx-auto px-4">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-muted/60 to-muted/20 p-12">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          <StatCounter value={12000} label="Skills listed" suffix="+" icon={Zap} color="bg-primary/10 text-primary" />
          <StatCounter value={8500} label="Exchanges completed" suffix="+" icon={RefreshCw} color="bg-secondary/10 text-secondary" />
          <StatCounter value={4.9} label="Average rating" suffix="★" icon={Star} color="bg-accent/10 text-accent" />
          <StatCounter value={150} label="Universities" suffix="+" icon={Users} color="bg-purple-500/10 text-purple-500" />
        </div>
      </div>
    </div>
  </Section>
);

/* ══════════════════════════════════════════════════════════════════════════════
   FEATURED SKILLS
══════════════════════════════════════════════════════════════════════════════ */
const FeaturedSkillsSection = () => {
  const featuredSkills = skills.slice(0, 6);
  const categoryColors: Record<string, string> = {
    Creative: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    Tech: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    Design: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    Language: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };

  return (
    <Section id="featured-skills" className="bg-muted/30 dark:bg-muted/10">
      <div className="container mx-auto px-4">
        <SectionLabel><TrendingUp className="h-3.5 w-3.5" /> Popular Right Now</SectionLabel>
        <SectionTitle>
          Skills you can learn{' '}
          <span className="text-gradient">today</span>
        </SectionTitle>
        <GradientUnderline />
        <motion.p
          variants={item}
          className="mx-auto mt-5 max-w-xl text-center text-muted-foreground text-balance"
        >
          Dive into a new passion or level up your career. Our community offers a diverse range of skills.
        </motion.p>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredSkills.map((skill, i) => {
            const teacher = users[i % users.length];
            const catColor = categoryColors[skill.category] ?? 'bg-muted text-muted-foreground border-border';
            return (
              <motion.div
                key={skill.id}
                variants={item}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300 } }}
              >
                <Card className="group h-full overflow-hidden glass transition-all duration-400 ease-snappy hover:shadow-glow-sm hover:-translate-y-2">
                  {/* Animated sheen line */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Zap className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold font-headline leading-tight">{skill.name}</h3>
                          <Badge className={cn('mt-1 border text-xs', catColor)}>{skill.category}</Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0 text-xs">{skill.level}</Badge>
                    </div>

                    <div className="mt-5 flex items-center gap-3 border-t border-border/50 pt-5">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-background">
                          <AvatarImage src={teacher.avatar} />
                          <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {teacher.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-secondary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{teacher.name}</p>
                        <p className="text-xs text-muted-foreground">{teacher.university} · ⭐ {teacher.rating}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-accent">
                        <Zap className="h-3.5 w-3.5" />
                        {teacher.skillexScore}
                      </div>
                    </div>

                    <Button className="mt-5 w-full rounded-2xl font-bold gradient-bg text-primary-foreground text-sm hover:scale-[1.02] shadow-glow transition-transform">
                      Request Exchange
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div variants={item} className="mt-12 text-center">
          <Button asChild size="lg" variant="outline" className="rounded-xl border-primary/30 hover:bg-primary/5 hover:border-primary/50">
            <Link to="/match">
              Browse all skills
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </Section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════════════════════════════ */
const testimonials = [
  {
    name: 'Nadia Rahman',
    university: 'BUET',
    avatar: 'https://picsum.photos/seed/101/100/100',
    role: 'Computer Science, 3rd Year',
    text: "SkillEx is a game-changer. I learned Python from a senior without spending a single taka. The platform is intuitive and the community is incredibly supportive.",
    rating: 5,
  },
  {
    name: 'Karim Chowdhury',
    university: 'Dhaka University',
    avatar: 'https://picsum.photos/seed/102/100/100',
    role: 'Business Studies, 2nd Year',
    text: "I was struggling with public speaking. Through SkillEx I found a practice partner who's now a close friend. It's boosted my confidence immensely.",
    rating: 5,
  },
  {
    name: 'Fatema Akhter',
    university: 'NSU',
    avatar: 'https://picsum.photos/seed/103/100/100',
    role: 'Graphic Design, 4th Year',
    text: "I traded Figma lessons for music production sessions. That's the magic — everyone wins, no one pays. Completely changed how I think about learning.",
    rating: 5,
  },
];

const TestimonialsSection = () => (
  <Section id="testimonials">
    <div className="container mx-auto px-4">
      <SectionLabel><Star className="h-3.5 w-3.5" /> Testimonials</SectionLabel>
      <SectionTitle>
        What students{' '}
        <span className="text-gradient">say</span>
      </SectionTitle>
      <GradientUnderline />

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -5, transition: { type: 'spring', stiffness: 300 } }}
          >
            <Card className="group relative h-full overflow-hidden glass transition-all duration-400 ease-snappy hover:shadow-glow-sm hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="relative p-8 flex flex-col h-full">
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Star key={si} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <Quote className="h-7 w-7 text-primary/20 mb-3 shrink-0" />
                <p className="flex-1 text-foreground/80 leading-relaxed text-sm">"{t.text}"</p>
                <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                  <Avatar className="h-11 w-11 ring-2 ring-background">
                    <AvatarImage src={t.avatar} />
                    <AvatarFallback>{t.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.role} · {t.university}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </Section>
);

/* ══════════════════════════════════════════════════════════════════════════════
   CTA BANNER
══════════════════════════════════════════════════════════════════════════════ */
const CtaBanner = () => {
  const { ref, isInView } = useScrollAnimation();
  return (
    <section className="w-full pb-24">
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={container}
        className="container mx-auto px-4"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-secondary p-16 text-center text-primary-foreground">
          {/* Noise texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
          />
          {/* Blobs */}
          <div className="animate-blob absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="animate-blob absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" style={{ animationDelay: '5s' }} />

          <motion.div variants={item} className="relative z-10 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" /> Free forever for students
          </motion.div>
          <motion.h2 variants={item} className="relative z-10 font-headline text-4xl font-extrabold md:text-5xl text-balance">
            Ready to start trading skills?
          </motion.h2>
          <motion.p variants={item} className="relative z-10 mt-4 max-w-lg mx-auto text-lg text-primary-foreground/80 text-balance">
            Join thousands of students who are leveling up — completely free.
          </motion.p>
          <motion.div variants={item} className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-2xl bg-white px-8 text-base font-bold text-primary shadow-lg hover:bg-white/90 hover:scale-105 transition-all"
            >
              <Link to="/login">Join for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-14 rounded-2xl px-8 text-base font-semibold text-primary-foreground hover:bg-white/10 border border-white/30"
            >
              <Link to="#how-it-works">See how it works</Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE EXPORT
══════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <MarketingLayout>
      <HeroSection />
      <SkillTicker />
      <HowItWorksSection />
      <SkillChainSection />
      <StatsSection />
      <FeaturedSkillsSection />
      <TestimonialsSection />
      <CtaBanner />
    </MarketingLayout>
  );
}

