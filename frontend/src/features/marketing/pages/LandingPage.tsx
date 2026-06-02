import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  Database,
  Figma,
  Film,
  Mic,
  Music,
  Pencil,
  Quote,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import MarketingLayout from '@/components/layout/MarketingLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { FeedbackService } from '@/services/feedbackService';
import type { Feedback } from '@/types';

const SkillOrbScene = lazy(() => import('@/components/three/SkillOrbScene'));

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const skillIconMap = {
  Film,
  Music,
  Code,
  Figma,
  Camera,
  Mic,
  Database,
  Pencil,
  TrendingUp,
} as const;

type SkillIconName = keyof typeof skillIconMap;

const skills = [
  {
    id: 'sk1',
    name: 'Video Editing',
    icon: 'Film',
    category: 'Creative',
    level: 'Beginner',
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=78',
  },
  {
    id: 'sk2',
    name: 'Python',
    icon: 'Code',
    category: 'Tech',
    level: 'Expert',
    image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=78',
  },
  {
    id: 'sk3',
    name: 'Figma UI Design',
    icon: 'Figma',
    category: 'Design',
    level: 'Moderate',
    image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=900&q=78',
  },
  {
    id: 'sk4',
    name: 'Photography',
    icon: 'Camera',
    category: 'Creative',
    level: 'Moderate',
    image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=900&q=78',
  },
  {
    id: 'sk5',
    name: 'Public Speaking',
    icon: 'Mic',
    category: 'Communication',
    level: 'Expert',
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=78',
  },
  {
    id: 'sk6',
    name: 'Data Science',
    icon: 'Database',
    category: 'Tech',
    level: 'Beginner',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=78',
  },
] satisfies Array<{
  id: string;
  name: string;
  icon: SkillIconName;
  category: string;
  level: string;
  image: string;
}>;

const learners = [
  {
    id: 'u1',
    name: 'Rahim Ahmed',
    university: 'BUET',
    rating: 4.8,
    score: 720,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80',
    teaches: 'Python',
    learns: 'Video Editing',
  },
  {
    id: 'u2',
    name: 'Nadia Ahmed',
    university: 'DU',
    rating: 4.9,
    score: 680,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
    teaches: 'Figma',
    learns: 'Public Speaking',
  },
  {
    id: 'u3',
    name: 'Karim Hasan',
    university: 'NSU',
    rating: 4.7,
    score: 610,
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=240&q=80',
    teaches: 'Photography',
    learns: 'Data Science',
  },
];

const fallbackReviews = [
  {
    id: 'seed-1',
    rating: 5,
    comment: 'SkillEX made learning feel less intimidating. I traded Python help for design feedback and both sessions were genuinely useful.',
    user: { name: 'Tonmoy', avatar: '', university: 'BRAC', level: 'MENTOR' },
  },
  {
    id: 'seed-2',
    rating: 5,
    comment: 'The best part is trust. I can see what someone teaches, what they want to learn, and how other students reviewed them.',
    user: { name: 'Maliha', avatar: '', university: 'DU', level: 'LEARNER' },
  },
  {
    id: 'seed-3',
    rating: 4,
    comment: 'It feels like a student community, not another paid course marketplace. The exchange idea is simple and practical.',
    user: { name: 'Arif', avatar: '', university: 'IUT', level: 'NEWCOMER' },
  },
] as Feedback[];

const Section = ({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => (
  <motion.section
    id={id}
    variants={stagger}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.18 }}
    className={cn('relative scroll-mt-28 py-20 sm:py-24 lg:py-28', className)}
  >
    {children}
  </motion.section>
);

const SectionHeader = ({
  label,
  title,
  description,
  align = 'center',
}: {
  label: string;
  title: React.ReactNode;
  description?: string;
  align?: 'center' | 'left';
}) => (
  <div className={cn('mx-auto max-w-3xl', align === 'center' ? 'text-center' : 'text-left')}>
    <motion.p
      variants={fadeUp}
      className={cn(
        'mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary/80',
        align === 'center' ? 'mx-auto' : ''
      )}
    >
      {label}
    </motion.p>
    <motion.h2
      variants={fadeUp}
      className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
    >
      {title}
    </motion.h2>
    {description && (
      <motion.p variants={fadeUp} className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </motion.p>
    )}
  </div>
);

const OrbFallback = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute right-[-8rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-primary/[0.15] blur-[92px]" />
    <div className="absolute bottom-[-12rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-secondary/[0.09] blur-[100px]" />
    <div className="absolute inset-0 dot-grid opacity-35" />
  </div>
);

const LandingBackground = ({ showScene }: { showScene: boolean }) => (
  <div className="pointer-events-none fixed inset-0 z-0 bg-background">
    <OrbFallback />
    {showScene && (
      <div className="absolute inset-0 block">
        <Suspense fallback={null}>
          <SkillOrbScene />
        </Suspense>
      </div>
    )}
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,9,20,0.70)_0%,rgba(5,9,20,0.42)_32%,rgba(5,9,20,0.02)_72%,rgba(5,9,20,0.12)_100%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_12%,rgba(0,245,212,0.16),transparent_32%)]" />
  </div>
);

const HeroSection = () => (
  <section className="relative flex min-h-[92svh] items-center overflow-hidden pt-24">
    <div className="container relative z-10 mx-auto px-4 pb-16 pt-8 lg:pb-20 lg:pt-16">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="relative max-w-[760px]">
        <div className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10 bg-[radial-gradient(ellipse_at_left,rgba(5,9,20,0.84),rgba(5,9,20,0.54)_46%,transparent_72%)] blur-sm" />
        <motion.h1
          variants={fadeUp}
          className="font-headline text-[3.25rem] font-extrabold leading-[0.98] tracking-tight text-foreground drop-shadow-[0_8px_34px_rgba(0,0,0,0.72)] sm:text-7xl lg:text-[5.6rem]"
        >
          Trade Skills.
          <span className="block text-gradient-animated">Not Money.</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-8 text-foreground/76 drop-shadow-[0_4px_20px_rgba(0,0,0,0.75)] sm:text-xl">
          Find someone who can teach what you need, then offer a skill you already know. SkillEX turns learning into a fair exchange between real students.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="gradient" size="lg" className="h-14 rounded-2xl px-8">
            <Link to="/login?tab=register">
              Start Exchanging Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 rounded-2xl border-white/10 bg-white/[0.03] px-8">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

const ComparisonSection = () => (
  <Section>
    <div className="container mx-auto px-4">
      <SectionHeader
        label="Why SkillEX"
        title={<>Learn by exchanging skills, not buying <span className="text-gradient">lessons</span>.</>}
        description="Most students already know something valuable. SkillEX helps them use that value to learn from another student without paying for every step."
      />
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <ComparisonCard
          label="Without SkillEX"
          title="Learning depends on budget and luck"
          items={['Paid tutoring is not always realistic for students', 'Campus groups are noisy and hard to filter', 'There is no simple proof of who is reliable']}
          muted
        />
        <ComparisonCard
          label="SkillEX"
          title="A clearer way to find the right student"
          items={['Match by what you teach and what you want to learn', 'Use reviews and SkillEX score before sending a request', 'Build your profile every time you complete an exchange']}
        />
      </div>
    </div>
  </Section>
);

const ComparisonCard = ({
  label,
  title,
  items,
  muted,
}: {
  label: string;
  title: string;
  items: string[];
  muted?: boolean;
}) => (
  <motion.div
    variants={fadeUp}
    className={cn(
      'rounded-[1.75rem] border p-6 sm:p-8',
      muted ? 'border-white/8 bg-white/[0.025]' : 'border-primary/20 bg-primary/[0.055] shadow-[0_20px_70px_rgba(0,245,212,0.08)]'
    )}
  >
    <p className={cn('text-xs font-bold uppercase tracking-[0.16em]', muted ? 'text-muted-foreground' : 'text-primary')}>
      {label}
    </p>
    <h3 className="mt-3 font-headline text-2xl font-bold">{title}</h3>
    <div className="mt-6 space-y-3">
      {items.map((entry) => (
        <div key={entry} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
          <span className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', muted ? 'bg-white/5 text-muted-foreground' : 'bg-primary/15 text-primary')}>
            {muted ? <ChevronRight className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          </span>
          {entry}
        </div>
      ))}
    </div>
  </motion.div>
);

const HowItWorksSection = () => {
  const steps = [
    {
      icon: Pencil,
      title: 'Add your teach and learn skills',
      text: 'Show what you can help with, what you want to learn, your level, and any useful proof from projects or classes.',
    },
    {
      icon: Bot,
      title: 'Find a fair student match',
      text: 'SkillEX compares both sides of the exchange so the request feels useful for the teacher and the learner.',
    },
    {
      icon: RefreshCw,
      title: 'Exchange, review, repeat',
      text: 'After the session, both students leave feedback. Good exchanges make the next match easier to trust.',
    },
  ];

  return (
    <Section id="how-it-works">
      <div className="container mx-auto px-4">
        <SectionHeader
          label="How it works"
          title={<>From profile to first session in <span className="text-gradient">three steps</span>.</>}
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="group relative min-h-[212px] overflow-hidden rounded-[1.45rem] border border-primary/25 bg-[rgba(6,20,29,0.92)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.26)] transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:bg-[#071923]"
            >
              <span className="absolute right-6 top-5 font-headline text-5xl font-black leading-none text-white/[0.035]">
                0{index + 1}
              </span>
              <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="relative z-10 mt-10 font-headline text-xl font-bold leading-tight text-foreground">{title}</h3>
              <p className="relative z-10 mt-4 text-sm leading-7 text-muted-foreground">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
};

const SkillChainSection = () => {
  const chainMembers = [
    { learner: learners[0], role: 'Learn', teaches: 'Video Editing', learns: 'Guitar', angle: -90 },
    { learner: learners[1], role: 'Teach', teaches: 'Guitar', learns: 'Python', angle: 30 },
    { learner: learners[2], role: 'Build', teaches: 'Python', learns: 'Video Editing', angle: 150 },
  ];
  const radius = 140;
  const cx = 180;
  const cy = 200;

  return (
  <Section id="skill-chain">
    <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-[0.9fr_1fr] lg:gap-16">
      <div>
        <SectionHeader
          align="left"
          label="Skill chain"
          title={<>A skill circle turns matching into <span className="text-gradient">real progress</span>.</>}
          description="The triangle is not a group chat. It is a focused loop where members learn, teach, and build proof through resources, help requests, and live events."
        />
        <motion.ul variants={stagger} className="mt-7 space-y-3">
          {[
            'Learn from people who are practicing the same skill',
            'Teach through help desk answers, resources, and office hours',
            'Build portfolio proof from circle challenges and events',
          ].map((point) => (
            <motion.li key={point} variants={fadeUp} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                <Check className="h-3 w-3" />
              </span>
              {point}
            </motion.li>
          ))}
        </motion.ul>
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-xl border-primary/30 bg-white/[0.03] hover:bg-primary/5 hover:border-primary/50">
            <Link to="/match">
              Find skill matches
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link to="/community?tab=circles">
              Join a skill circle
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
      <motion.div variants={fadeUp} className="relative mx-auto flex w-full max-w-[460px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[#071018]/78 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.30)] backdrop-blur sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(0,245,212,0.12),transparent_58%)]" />
        <svg viewBox="0 0 360 400" className="relative z-10 w-full max-w-sm" fill="none" role="img" aria-label="Skill chain triangle exchange">
          <motion.circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4 6"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          {chainMembers.map((_, index) => {
            const startAngle = (chainMembers[index].angle * Math.PI) / 180;
            const endAngle = (chainMembers[(index + 1) % 3].angle * Math.PI) / 180;
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);

            return (
              <motion.line
                key={`chain-line-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#chainGrad)"
                strokeWidth="2"
                strokeDasharray="240"
                initial={{ strokeDashoffset: 240 }}
                whileInView={{ strokeDashoffset: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + index * 0.18 }}
              />
            );
          })}
          <defs>
            <linearGradient id="chainGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" />
            </linearGradient>
            {chainMembers.map((member, index) => {
              const angle = (member.angle * Math.PI) / 180;
              const x = cx + radius * Math.cos(angle);
              const y = cy + radius * Math.sin(angle);
              return (
                <clipPath key={`clip-${member.learner.id}`} id={`chainClip${index}`}>
                  <circle cx={x} cy={y} r="22" />
                </clipPath>
              );
            })}
          </defs>

          <motion.circle
            cx={cx}
            cy={cy}
            r="38"
            fill="hsl(var(--primary) / 0.10)"
            stroke="hsl(var(--primary) / 0.34)"
            strokeWidth="1"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 140 }}
          />
          <motion.text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fill="hsl(var(--primary))" fontWeight="800">
            Skill
          </motion.text>
          <motion.text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="hsl(var(--primary))" fontWeight="800">
            Circle
          </motion.text>

          {chainMembers.map((member, index) => {
            const angle = (member.angle * Math.PI) / 180;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);

            return (
              <motion.g
                key={member.learner.id}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + index * 0.18, type: 'spring', stiffness: 130 }}
              >
                <circle cx={x} cy={y} r="30" fill="hsl(var(--card))" stroke="hsl(var(--primary) / 0.45)" strokeWidth="1.5" />
                <image href={member.learner.avatar} x={x - 22} y={y - 22} width="44" height="44" clipPath={`url(#chainClip${index})`} />
                <text x={x} y={y + 46} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontWeight="700">
                  {member.role}
                </text>
                <text x={x} y={y + 60} textAnchor="middle" fontSize="9" fill="hsl(var(--primary))" fontWeight="600">
                  Teaches {member.teaches}
                </text>
                <text x={x} y={y + 73} textAnchor="middle" fontSize="9" fill="hsl(var(--secondary))" fontWeight="600">
                  Learns {member.learns}
                </text>
              </motion.g>
            );
          })}
        </svg>
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 text-center">
          {[
            ['Next event', 'Office hour'],
            ['Active circle', 'Python AI'],
            ['Solved help', '24 threads'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/35 px-2 py-2 backdrop-blur">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="mt-1 truncate text-xs font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>
        <div className="hidden">
          {learners.map((learner, index) => (
            <div
              key={learner.id}
              className={cn(
                'rounded-[1.35rem] border border-white/10 bg-background/72 p-4 shadow-lg',
                index === 1 && 'sm:translate-y-8'
              )}
            >
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={learner.avatar} alt={learner.name} />
                <AvatarFallback>{learner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="mt-4 font-headline text-lg font-bold">{learner.name}</h3>
              <p className="text-xs text-muted-foreground">{learner.university} · {learner.rating} rating</p>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Teaches</span> <span className="font-semibold text-primary">{learner.teaches}</span></p>
                <p><span className="text-muted-foreground">Learns</span> <span className="font-semibold text-secondary">{learner.learns}</span></p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </Section>
  );
};

const StatsSection = () => (
  <Section className="py-10 sm:py-12">
    <div className="container mx-auto px-4">
      <motion.div
        variants={fadeUp}
        className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          ['12k+', 'Skills listed'],
          ['8.5k+', 'Exchanges completed'],
          ['4.9', 'Average rating'],
          ['150+', 'Universities'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl bg-background/50 p-5 text-center">
            <p className="font-headline text-4xl font-black text-primary">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  </Section>
);

const FeaturedSkillsSection = () => (
  <Section id="featured-skills">
    <div className="container mx-auto px-4">
      <SectionHeader
        label="Skills available"
        title={<>Find a student who teaches the skill you <span className="text-gradient">need</span>.</>}
        description="Browse real skill offers from students, check their rating, and request an exchange that fits your learning goal."
      />
      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {skills.map((skill, index) => {
          const Icon = skillIconMap[skill.icon];
          const learner = learners[index % learners.length];
          return (
            <motion.article
              key={skill.id}
              variants={fadeUp}
              className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#071018]/78 transition duration-300 hover:-translate-y-1 hover:border-primary/25"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={skill.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071018] via-[#071018]/20 to-transparent" />
                <Badge className="absolute left-4 top-4 border-white/10 bg-black/45 text-white backdrop-blur">
                  {skill.category}
                </Badge>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-headline text-xl font-bold">{skill.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{skill.level} friendly exchange</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="font-semibold text-secondary">{learner.score}</p>
                    <p>SkillEX score</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={learner.avatar} alt={learner.name} />
                    <AvatarFallback>{learner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{learner.name}</p>
                    <p className="text-xs text-muted-foreground">{learner.university} · {learner.rating} rating</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.03]">
                    <Link to="/match">Match</Link>
                  </Button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  </Section>
);

const TestimonialsSection = ({
  feedbacks,
  onFeedbackSubmitted,
}: {
  feedbacks: Feedback[];
  onFeedbackSubmitted: () => void;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const visibleFeedbacks = feedbacks.length > 0 ? feedbacks : fallbackReviews;
  const selected = visibleFeedbacks.slice(activeIndex, activeIndex + 3);
  const cards = selected.length === 3 ? selected : [...selected, ...visibleFeedbacks].slice(0, 3);

  const next = () => setActiveIndex((value) => (value + 1) % visibleFeedbacks.length);
  const prev = () => setActiveIndex((value) => (value - 1 + visibleFeedbacks.length) % visibleFeedbacks.length);

  return (
    <Section id="testimonials">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            align="left"
            label="Student feedback"
            title={<>Reviews help students choose the right <span className="text-gradient">exchange partner</span>.</>}
            description="After every exchange, students can leave feedback so future learners know who communicates clearly and teaches well."
          />
          <motion.div variants={fadeUp} className="flex gap-2">
            <Button variant="outline" size="icon" className="border-white/10 bg-white/[0.03]" onClick={prev} aria-label="Previous reviews">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-white/[0.03]" onClick={next} aria-label="Next reviews">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {cards.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        <motion.div variants={fadeUp} className="mt-8 flex justify-center">
          <Button className="rounded-2xl px-7" onClick={() => setDialogOpen(true)}>
            Submit Your Feedback
          </Button>
        </motion.div>
      </div>
      <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} onFeedbackSubmitted={onFeedbackSubmitted} />
    </Section>
  );
};

const ReviewCard = ({ review }: { review: Feedback }) => (
  <motion.article
    variants={fadeUp}
    className="flex min-h-[280px] flex-col justify-between rounded-[1.5rem] border border-white/10 bg-[#071018]/78 p-6"
  >
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={cn('h-4 w-4', index < review.rating ? 'fill-secondary text-secondary' : 'text-white/15')}
            />
          ))}
        </div>
        <Quote className="h-6 w-6 text-primary/35" />
      </div>
      <p className="text-sm leading-7 text-foreground/88">"{review.comment}"</p>
    </div>
    <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
      <Avatar className="h-11 w-11">
        <AvatarImage src={review.user.avatar} alt={review.user.name} />
        <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold">{review.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {(review.user.level || 'student').toLowerCase()} · {review.user.university || 'SkillEX'}
        </p>
      </div>
    </div>
  </motion.article>
);

const FeedbackDialog = ({
  open,
  onOpenChange,
  onFeedbackSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeedbackSubmitted: () => void;
}) => {
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (comment.trim().length < 10) return;

    try {
      setSubmitting(true);
      setMessage('');
      await FeedbackService.create({ rating, comment });
      setComment('');
      setRating(5);
      setMessage('Your feedback has been published.');
      onFeedbackSubmitted();
      window.setTimeout(() => onOpenChange(false), 1300);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-white/10 bg-[#071018] text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl font-bold">Share Your Feedback</DialogTitle>
          <DialogDescription>Only registered SkillEX students can publish platform reviews.</DialogDescription>
        </DialogHeader>
        {isAuthenticated ? (
          <form onSubmit={submit} className="space-y-5">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="rounded-lg p-1">
                  <Star className={cn('h-7 w-7', star <= rating ? 'fill-secondary text-secondary' : 'text-white/20')} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Share what changed after your SkillEX exchange..."
              className="w-full resize-none rounded-2xl border border-white/10 bg-background/60 p-4 text-sm outline-none transition focus:border-primary/50"
            />
            {message && <p className="text-center text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={submitting || comment.trim().length < 10} className="w-full rounded-2xl">
              {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish Review
            </Button>
          </form>
        ) : (
          <div className="py-5 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <p className="mx-auto mb-5 max-w-xs text-sm text-muted-foreground">
              Sign in first, then come back to add your SkillEX story to the public reviews.
            </p>
            <Button asChild className="rounded-2xl">
              <Link to="/login" onClick={() => onOpenChange(false)}>Sign In / Register</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CtaSection = () => (
  <Section className="pb-28">
    <div className="container mx-auto px-4">
      <motion.div
        variants={fadeUp}
        className="overflow-hidden rounded-[2rem] border border-primary/20 bg-[#071018]/85 p-8 text-center shadow-[0_30px_100px_rgba(0,245,212,0.10)] sm:p-12"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Zap className="h-6 w-6" />
        </div>
        <h2 className="font-headline text-3xl font-extrabold sm:text-5xl">Ready to start trading skills?</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Join SkillEX, create your profile, and turn what you already know into the next skill you want.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="gradient" size="lg" className="rounded-2xl px-8">
            <Link to="/login?tab=register">
              Join for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl border-white/10 bg-white/[0.03] px-8">
            <Link to="/match">Browse skills</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </Section>
);

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [showScene, setShowScene] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const canRunScene = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const veryLowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
    return window.innerWidth >= 560 && window.matchMedia('(hover: hover)').matches && !veryLowMemory && !reduceMotion;
  }, [reduceMotion]);

  const fetchFeedbacks = async () => {
    try {
      const data = await FeedbackService.getAll();
      setFeedbacks(data);
    } catch (error) {
      console.warn('Failed to fetch landing feedbacks', error);
    }
  };

  useEffect(() => {
    if (!canRunScene) {
      setShowScene(false);
      return;
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => setShowScene(true), { timeout: 1800 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timeout = window.setTimeout(() => setShowScene(true), 1000);
    return () => window.clearTimeout(timeout);
  }, [canRunScene]);

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => void fetchFeedbacks(), { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timeout = window.setTimeout(() => void fetchFeedbacks(), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <MarketingLayout>
      <LandingBackground showScene={showScene} />
      <div className="relative z-10 overflow-hidden">
        <HeroSection />
        <ComparisonSection />
        <HowItWorksSection />
        <SkillChainSection />
        <StatsSection />
        <FeaturedSkillsSection />
        <TestimonialsSection feedbacks={feedbacks} onFeedbackSubmitted={fetchFeedbacks} />
        <CtaSection />
      </div>
    </MarketingLayout>
  );
}
