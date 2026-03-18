
import React, { useRef, lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  Zap, Code, Film, Music, Figma, Camera, Mic, Database, ArrowRight,
  Pencil, Bot, RefreshCw, Star, Quote, Users, Sparkles, TrendingUp,
  Shield, ChevronRight, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCounter } from '@/hooks/useCounter';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

/* Static display data for the marketing page — no auth/API needed */
const skills = [
  { id: 'sk1',  name: 'Video Editing',    icon: 'Film',     category: 'Creative',      level: 'beginner'  as const },
  { id: 'sk2',  name: 'Guitar',           icon: 'Music',    category: 'Creative',      level: 'moderate'  as const },
  { id: 'sk3',  name: 'Python',           icon: 'Code',     category: 'Tech',          level: 'expert'    as const },
  { id: 'sk4',  name: 'Figma',            icon: 'Figma',    category: 'Design',        level: 'beginner'  as const },
  { id: 'sk5',  name: 'Photography',      icon: 'Camera',   category: 'Creative',      level: 'moderate'  as const },
  { id: 'sk6',  name: 'Public Speaking',  icon: 'Mic',      category: 'Communication', level: 'expert'    as const },
  { id: 'sk7',  name: 'Data Science',     icon: 'Database', category: 'Tech',          level: 'beginner'  as const },
  { id: 'sk8',  name: 'Graphic Design',   icon: 'Pencil',   category: 'Design',        level: 'moderate'  as const },
  { id: 'sk9',  name: 'English Writing',  icon: 'Pencil',   category: 'Language',      level: 'expert'    as const },
  { id: 'sk10', name: 'Web Dev',          icon: 'Code',     category: 'Tech',          level: 'beginner'  as const },
  { id: 'sk11', name: 'Music Production', icon: 'Music',    category: 'Creative',      level: 'moderate'  as const },
  { id: 'sk12', name: 'Digital Marketing',icon: 'TrendingUp',category: 'Business',     level: 'expert'    as const },
  { id: 'sk13', name: 'French Language',  icon: 'Bot',      category: 'Language',      level: 'beginner'  as const },
  { id: 'sk14', name: 'Drawing',          icon: 'Pencil',   category: 'Creative',      level: 'moderate'  as const },
  { id: 'sk15', name: 'Chess',            icon: 'RefreshCw',category: 'Strategy',      level: 'expert'    as const },
  { id: 'sk16', name: 'Excel',            icon: 'Database', category: 'Business',      level: 'beginner'  as const },
  { id: 'sk17', name: 'UI/UX Design',     icon: 'Figma',    category: 'Design',        level: 'moderate'  as const },
  { id: 'sk18', name: '3D Modeling',      icon: 'Code',     category: 'Design',        level: 'expert'    as const },
  { id: 'sk19', name: 'Calligraphy',      icon: 'Pencil',   category: 'Creative',      level: 'beginner'  as const },
  { id: 'sk20', name: 'Cooking',          icon: 'Star',     category: 'Lifestyle',     level: 'moderate'  as const },
];

const users = [
  { id: 'u1', name: 'Rahim Ahmed',   avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', university: 'BUET', rating: 4.5, skillexScore: 500, isOnline: true  },
  { id: 'u2', name: 'Nadia Ahmed',   avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', university: 'DU',   rating: 4.6, skillexScore: 550, isOnline: false },
  { id: 'u3', name: 'Karim Ahmed',   avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80', university: 'NSU',  rating: 4.7, skillexScore: 600, isOnline: true  },
  { id: 'u4', name: 'Fatema Ahmed',  avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80', university: 'BRAC', rating: 4.8, skillexScore: 650, isOnline: false },
  { id: 'u5', name: 'Arif Ahmed',    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', university: 'IUT',  rating: 4.9, skillexScore: 700, isOnline: true  },
  { id: 'u6', name: 'Sumaiya Ahmed', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', university: 'CUET', rating: 4.5, skillexScore: 750, isOnline: false },
];
import MarketingLayout from '@/components/layout/MarketingLayout';

/* Lazy-loaded: Three.js module never downloaded on mobile */
const SkillOrbScene = lazy(() => import('@/components/three/SkillOrbScene'));

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

const SectionLabel = ({ children, align = 'center' }: { children: React.ReactNode, align?: 'center' | 'start' }) => (
  <motion.div variants={item} className={cn("flex items-center mb-6", align === 'center' ? 'justify-center' : 'justify-start')}>
    <div className="inline-flex items-center gap-3">
      {align === 'center' && (
        <div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent to-primary/40" />
      )}
      <span className="flex items-center gap-2 text-xs md:text-sm font-semibold uppercase tracking-[0.15em] text-primary/80">
        {children}
      </span>
      <div className={cn("h-[1px] bg-gradient-to-l from-transparent to-primary/40", align === 'center' ? 'w-8 md:w-16' : 'w-16 md:w-32')} />
    </div>
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

/* ── Spotlight Card wrapper ────────────────────────────────────────────── */
const SpotlightCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn("relative overflow-hidden", className)}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(0,229,195,0.08), transparent 40%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

/* ── Magnetic pull wrapper for buttons ─────────────────────────────────── */
const Magnetic = ({ children }: { children: React.ReactElement }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const x = clientX - centerX;
    const y = clientY - centerY;
    setPosition({ x: x * 0.35, y: y * 0.35 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  );
};

/* ── 3D Mouse Parallax for Hero text ───────────────────────────────────── */
const HeroParallax = ({ children }: { children: React.ReactNode }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position between -1 and 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      style={{
        rotateY: mousePos.x * 5.5,
        rotateX: -mousePos.y * 5.5,
        x: mousePos.x * 12,
        y: mousePos.y * 12,
        transformStyle: 'preserve-3d' as const,
      }}
      transition={{ type: 'spring', stiffness: 45, damping: 22 }}
    >
      {children}
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   SKILL EXCHANGE ANIMATION — live preview used inside How It Works
══════════════════════════════════════════════════════════════════════════════ */
const SkillExchangeAnimation = () => (
  <motion.div
    variants={item}
    className="relative mx-auto mb-20 max-w-2xl overflow-hidden rounded-3xl border border-border/50 bg-muted/20 p-8 backdrop-blur-sm"
  >
    {/* Header label */}
    <div className="mb-6 flex items-center justify-center gap-3">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Live Exchange Preview
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>

    <div className="relative flex items-center justify-between gap-3">
      {/* ── User A ── */}
      <div className="flex flex-col items-center gap-2.5 shrink-0">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-violet-500/25 ring-2 ring-background shadow-lg">
          <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" alt="Arya" className="h-full w-full object-cover" />
        </div>
        <p className="text-sm font-bold">Arya</p>
        <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400 bg-violet-500/5">
          Teaches Figma
        </Badge>
      </div>

      {/* ── Exchange lane ── */}
      <div className="relative flex-1 h-20 overflow-hidden">
        {/* Figma pill → right */}
        <motion.div
          className="absolute top-3 left-0 flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-400 whitespace-nowrap shadow-sm"
          animate={{ x: ['-15%', '115%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
        >
          <Figma className="h-2.5 w-2.5" />
          Figma <ArrowRight className="h-2.5 w-2.5" />
        </motion.div>

        {/* Python pill ← left */}
        <motion.div
          className="absolute bottom-3 right-0 flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary whitespace-nowrap shadow-sm"
          animate={{ x: ['15%', '-115%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6, delay: 1.3 }}
        >
          <ArrowRight className="h-2.5 w-2.5 rotate-180" />
          <Code className="h-2.5 w-2.5" />
          Python
        </motion.div>
      </div>

      {/* ── User B ── */}
      <div className="flex flex-col items-center gap-2.5 shrink-0">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 ring-2 ring-background shadow-lg">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Dev" className="h-full w-full object-cover" />
        </div>
        <p className="text-sm font-bold">Dev</p>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
          Teaches Python
        </Badge>
      </div>
    </div>

    {/* Footer note */}
    <p className="mt-5 text-center text-xs text-muted-foreground">
      Both learn. Both teach.{' '}
      <span className="font-semibold text-foreground/60">Zero payment needed.</span>
    </p>
  </motion.div>
);

/* ══════════════════════════════════════════════════════════════════════════════
   COMPARISON SECTION
══════════════════════════════════════════════════════════════════════════════ */
const beforeItems = [
  'Pay for every tutoring session',
  'Cold DMs with zero responses',
  'No accountability or reviews',
  'Scattered across multiple platforms',
  'You are always the student, never the teacher',
];

const afterItems = [
  'Completely free — forever for students',
  'AI-matched by skill & learning goal',
  'Verified ratings and trust system',
  'One platform, everything unified',
  'Both teach and learn simultaneously',
];

const ComparisonSection = () => {
  return (
    <Section className="w-full">
      <div className="container mx-auto px-4">
        <SectionLabel>
          <RefreshCw className="h-3.5 w-3.5" /> The Difference
        </SectionLabel>
        <SectionTitle>
          Learning is broken.{' '}
          <span className="text-gradient">We fixed it.</span>
        </SectionTitle>
        <GradientUnderline />

        <div className="mt-16 flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:gap-0">
          {/* ── BEFORE card ── */}
          <motion.div
            variants={{
              hidden: { opacity: 0, x: -56 },
              visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 70, damping: 18, delay: 0.1 } },
            }}
            className="flex-1 lg:rounded-r-none lg:border-r-0"
          >
            <SpotlightCard className="h-full rounded-3xl p-8 lg:rounded-r-none lg:border-r-0 glass-subtle">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/20">
                  <X className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  The Old Way
                </p>
              </div>
              <h3 className="mt-5 text-2xl font-extrabold font-headline text-foreground/60">
                The Struggle
              </h3>
              <ul className="mt-7 space-y-4">
                {beforeItems.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/8">
                      <X className="h-3 w-3 text-destructive/50" />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          </motion.div>

          {/* ── VS divider ── */}
          <div className="flex items-center justify-center py-2 lg:flex-col lg:py-0 lg:pt-10 z-10">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full glass font-headline text-sm font-black text-muted-foreground shadow-glow-sm">
              VS
            </div>
          </div>

          {/* ── AFTER card ── */}
          <motion.div
            variants={{
              hidden: { opacity: 0, x: 56 },
              visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 70, damping: 18, delay: 0.1 } },
            }}
            className="flex-1 lg:rounded-l-none"
          >
            <SpotlightCard className="h-full rounded-3xl p-8 lg:rounded-l-none glass border-primary/20">
              {/* Subtle glow blob */}
              <div className="pointer-events-none absolute -top-20 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl opacity-50" />

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary/75">
                  The SkiilEX Way
                </p>
              </div>
              <h3 className="mt-5 text-2xl font-extrabold font-headline">The Exchange</h3>
              <ul className="mt-7 space-y-4">
                {afterItems.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </Section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   HERO SECTION
══════════════════════════════════════════════════════════════════════════════ */

// Left column: stacked on the far-left edge
// Right column: stacked on the far-right edge
// None are near the center content area (max-w-5xl)
const floatingSkillsData = [
  // ── Left column ──────────────────────────────────────────
  { name: 'Guitar', icon: Music, image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=150&q=80', side: 'left', top: '12%', delay: 0, duration: 3.8 },
  { name: 'Photography', icon: Camera, image: 'https://images.unsplash.com/photo-1516245834210-c4c14271569b?auto=format&fit=crop&w=150&q=80', side: 'left', top: '32%', delay: 0.6, duration: 4.2 },
  { name: 'Video Editing', icon: Film, image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=150&q=80', side: 'left', top: '54%', delay: 1.2, duration: 3.5 },
  { name: 'Git & GitHub', icon: TrendingUp, image: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=150&q=80', side: 'left', top: '74%', delay: 1.8, duration: 4.6 },
  // ── Right column ─────────────────────────────────────────
  { name: 'Python', icon: Code, image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=150&q=80', side: 'right', top: '18%', delay: 0.3, duration: 4.0 },
  { name: 'Data Science', icon: Database, image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=150&q=80', side: 'right', top: '38%', delay: 0.9, duration: 3.6 },
  { name: 'Figma', icon: Figma, image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=150&q=80', side: 'right', top: '58%', delay: 1.5, duration: 4.4 },
  { name: 'Public Speaking', icon: Mic, image: 'https://images.unsplash.com/photo-1475721025505-8b3d602db069?auto=format&fit=crop&w=150&q=80', side: 'right', top: '76%', delay: 2.1, duration: 3.9 },
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
        className="flex items-center gap-3 rounded-full border border-white/5 bg-white-[2%] backdrop-blur-xl p-1.5 pr-5 text-sm font-medium shadow-2xl shadow-primary/5 cursor-default select-none glass-subtle overflow-hidden relative"
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: skill.duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: skill.delay,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50 z-0" />
        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-background">
          <img src={skill.image} alt={skill.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-110" />
        </div>
        <span className="relative z-10 text-foreground/90 whitespace-nowrap font-semibold tracking-tight">{skill.name}</span>
      </motion.div>
    </motion.div>
  );
});
FloatingBubble.displayName = 'FloatingBubble';

const HeroSection = () => {
  /* Word-level stagger variants */
  const wordContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.6 } },
  };
  const wordItem = {
    hidden: { opacity: 0, y: 48, rotateX: -20 },
    visible: {
      opacity: 1, y: 0, rotateX: 0,
      transition: { type: 'spring' as const, stiffness: 80, damping: 16 }
    },
  };
  /* Second line starts after first line is done */
  const line2Container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.14, delayChildren: 1.05 } },
  };

  return (
    <section className="relative flex min-h-screen w-full overflow-hidden bg-transparent">

      {/* ── All hero text ── */}
      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-24 md:px-12 lg:px-20 xl:px-28">
        <HeroParallax>
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-8 max-w-xl"
          >
            {/* Social proof badge */}
            <motion.div variants={item}>
              <Link to="/login" className="group relative inline-flex items-center gap-3 rounded-full glass-subtle border-white/5 px-2 py-2 pr-5 text-sm font-medium text-foreground/80 transition-all hover:text-foreground hover:shadow-glow-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="relative z-10">Trusted by <strong className="text-foreground font-semibold">12,000+ students</strong> &middot; 150+ universities</span>
                <ChevronRight className="relative z-10 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Headline — High-impact cinematic reveal optimized for laptops */}
            <div
              className="font-headline font-extrabold tracking-tighter leading-[0.95] text-6xl md:text-8xl lg:text-[5.5rem] xl:text-[6.2rem]"
              style={{ perspective: '1200px' }}
            >
              {/* Line 1: "Trade Skills" — High-speed slide from left */}
              <motion.div
                initial={{ opacity: 0, x: -120, filter: 'blur(15px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  type: 'spring', stiffness: 100, damping: 15, mass: 0.8,
                  delay: 0.5,
                  filter: { type: 'tween', duration: 0.7, ease: 'easeOut', delay: 0.5 },
                }}
                className="flex flex-nowrap gap-x-4 mb-2 overflow-visible select-none"
              >
                {['Trade', 'Skills'].map((word) => (
                  <span key={word} className="inline-block whitespace-nowrap">
                    {word}
                  </span>
                ))}
              </motion.div>

              {/* Line 2: "Not Money." — Cinematic reveal following the slide */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(10px)', rotateX: -10 }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', rotateX: 0 }}
                transition={{
                  type: 'spring', stiffness: 60, damping: 18, mass: 1,
                  delay: 1.1,
                  filter: { type: 'tween', duration: 0.9, ease: 'easeOut', delay: 1.1 },
                }}
                className="flex flex-nowrap gap-x-4 select-none"
              >
                {['Not', 'Money.'].map((word) => (
                  <span
                    key={word}
                    className="inline-block text-gradient-animated whitespace-nowrap"
                  >
                    {word}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Subheadline */}
            <motion.p
              variants={item}
              className="text-lg text-muted-foreground leading-relaxed md:text-xl max-w-md"
            >
              Connect with students who have what you want to learn — and teach what you know.
              No payments. Just pure knowledge exchange.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row">
              <Magnetic>
                <Button asChild variant="gradient" size="lg" className="group h-14 rounded-2xl px-10 text-base shadow-glow hover:shadow-glow-lg transition-all">
                  <Link to="/login">
                    Start Exchanging Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </Magnetic>
              <Button size="lg" variant="outline" className="h-14 rounded-2xl px-8 text-base font-semibold border-border/60 hover:border-primary/40 hover:bg-primary/5" onClick={() => { const el = document.getElementById('how-it-works'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                See how it works
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
        </HeroParallax>
      </div>
    </section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   TICKER / MARQUEE
══════════════════════════════════════════════════════════════════════════════ */
const SkillTicker = () => {
  const skillNames = skills.map((s) => s.name);
  const doubled = [...skillNames, ...skillNames];
  return (
    <div className="relative w-full overflow-hidden border-y border-white/5 bg-background/5 backdrop-blur-md py-4">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background/50 to-transparent" />
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
      color: 'from-primary/15 to-primary/5 border-primary/20',
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

        <SkillExchangeAnimation />

        <div className="relative mt-0 grid gap-8 md:grid-cols-3">
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
    <Section id="skill-chain" className="bg-transparent">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left copy */}
          <div className="space-y-6">
            <SectionLabel align="start"><Zap className="h-3.5 w-3.5" /> Skill Chains</SectionLabel>
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
  icon: React.ComponentType<{ className?: string }>; color: string;
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
      <SpotlightCard className="rounded-[2.5rem] glass p-12 hover:shadow-glow-sm transition-all border border-primary/10">
        {/* Subtle background glow for stats box */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-30 pointer-events-none z-0" />
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4 relative z-10">
          <StatCounter value={12000} label="Skills listed" suffix="+" icon={Zap} color="bg-primary/10 text-primary" />
          <StatCounter value={8500} label="Exchanges completed" suffix="+" icon={RefreshCw} color="bg-secondary/10 text-secondary" />
          <StatCounter value={4.9} label="Average rating" suffix="★" icon={Star} color="bg-accent/10 text-accent" />
          <StatCounter value={150} label="Universities" suffix="+" icon={Users} color="bg-purple-500/10 text-purple-500" />
        </div>
      </SpotlightCard>
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
    Tech: 'bg-primary/10 text-primary border-primary/20',
    Design: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    Language: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };

  return (
    <Section id="featured-skills" className="bg-transparent">
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

                    <Button variant="gradient" className="mt-5 w-full rounded-2xl text-sm">
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
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
    role: 'Computer Science, 3rd Year',
    text: "SkillEx is a game-changer. I learned Python from a senior without spending a single taka. The platform is intuitive and the community is incredibly supportive.",
    rating: 5,
  },
  {
    name: 'Karim Chowdhury',
    university: 'Dhaka University',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=100&q=80',
    role: 'Business Studies, 2nd Year',
    text: "I was struggling with public speaking. Through SkillEx I found a practice partner who's now a close friend. It's boosted my confidence immensely.",
    rating: 5,
  },
  {
    name: 'Fatema Akhter',
    university: 'NSU',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80',
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
            className="h-full"
          >
            <SpotlightCard className="group h-full rounded-2xl glass transition-all duration-400 ease-snappy hover:shadow-glow-sm border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
              <div className="relative p-8 flex flex-col h-full z-10">
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
              </div>
            </SpotlightCard>
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
  return (
    <Section className="w-full pb-32">
      <div className="container mx-auto px-4">
        <SpotlightCard className="rounded-3xl glass-strong border border-primary/20 p-16 text-center text-foreground shadow-glow">
          {/* Noise texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] z-0"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
          />
          {/* Blobs */}
          <div className="animate-blob absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl opacity-50 z-0" />
          <div className="animate-blob absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-secondary/20 blur-3xl opacity-50 z-0" style={{ animationDelay: '5s' }} />

          <motion.div variants={item} className="relative z-10 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium mb-6 text-primary">
            <Sparkles className="h-4 w-4" /> Free forever for students
          </motion.div>
          <motion.h2 variants={item} className="relative z-10 font-headline text-4xl font-extrabold md:text-5xl text-balance">
            Ready to start trading skills?
          </motion.h2>
          <motion.p variants={item} className="relative z-10 mt-4 max-w-lg mx-auto text-lg text-foreground/80 text-balance">
            Join thousands of students who are leveling up — completely free.
          </motion.p>
          <motion.div variants={item} className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-2xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-glow hover:bg-primary/90 hover:scale-105 transition-all"
            >
              <Link to="/login">Join for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-2xl px-8 text-base font-semibold border-white/10 hover:bg-white/5"
              onClick={() => { const el = document.getElementById('how-it-works'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            >
              See how it works
            </Button>
          </motion.div>
        </SpotlightCard>
      </div>
    </Section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE EXPORT
══════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  /* Show Three.js scene only on desktop+hover-capable devices */
  const [showScene, setShowScene] = useState(() =>
    typeof window !== 'undefined' &&
    window.innerWidth >= 1024 &&
    window.matchMedia('(hover: hover)').matches,
  );

  useEffect(() => {
    const check = () =>
      setShowScene(
        window.innerWidth >= 1024 &&
        window.matchMedia('(hover: hover)').matches,
      );
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <MarketingLayout>
      {/* --- Fixed Space Background --- */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background overflow-hidden">
        {showScene ? (
          <div className="absolute inset-0 z-0">
            <Suspense
              fallback={
                <div className="absolute inset-0 overflow-hidden">
                  <div className="animate-blob absolute top-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
                </div>
              }
            >
              <SkillOrbScene />
            </Suspense>
          </div>
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            <div className="animate-blob absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
            <div className="animate-blob absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/8 blur-[120px]" style={{ animationDelay: '4s', animationDuration: '16s' }} />
            <div className="animate-blob absolute -bottom-40 -right-40 h-[550px] w-[550px] rounded-full bg-accent/8 blur-[100px]" style={{ animationDelay: '8s' }} />
          </div>
        )}
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-40 dark:opacity-20" />
      </div>

      <div className="relative z-10 w-full">
        <HeroSection />
        <SkillTicker />
        <ComparisonSection />
        <HowItWorksSection />
        <SkillChainSection />
        <StatsSection />
        <FeaturedSkillsSection />
        <TestimonialsSection />
        <CtaBanner />
      </div>
    </MarketingLayout>
  );
}

