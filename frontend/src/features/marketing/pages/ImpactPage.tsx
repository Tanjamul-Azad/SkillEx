import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users,
  Repeat,
  Clock,
  PiggyBank,
  Award,
  Boxes,
  MessagesSquare,
  Handshake,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import MarketingLayout from '@/components/layout/MarketingLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCounter } from '@/hooks/useCounter';
import { cn } from '@/lib/utils';
import { analyticsService, type ImpactStats } from '@/services/analyticsService';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } },
};

/** Animated number that counts up when scrolled into view. */
function Counter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const { ref } = useCounter(value, { duration: 1.8 });
  return (
    <span className="inline-flex items-baseline tabular-nums">
      {prefix && <span>{prefix}</span>}
      <span ref={ref} />
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

function HeroStat({
  icon: Icon,
  value,
  prefix,
  suffix,
  label,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={item}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6',
        accent
          ? 'border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card'
          : 'border-border/60 bg-card',
      )}
    >
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl border',
          accent ? 'border-primary/30 bg-primary/15 text-primary' : 'border-border/60 bg-muted/40 text-foreground',
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          <Counter value={value} prefix={prefix} suffix={suffix} />
        </p>
        <p className="mt-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{sub}</p>
      </div>
    </motion.div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <motion.div variants={item} className="rounded-xl border border-border/60 bg-card p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-foreground">
        <Counter value={value} />
      </p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export default function ImpactPage() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    analyticsService.impact(6)
      .then((data) => { if (alive) setStats(data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  const topSkills = stats?.topSkills ?? [];
  const maxSkillCount = topSkills.reduce((max, s) => Math.max(max, s.count), 0) || 1;

  return (
    <MarketingLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
        {/* Hero */}
        <motion.div initial="hidden" animate="visible" variants={container} className="text-center">
          <motion.div variants={item} className="flex justify-center">
            <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
              <TrendingUp className="mr-1 h-3 w-3" />
              Live platform impact
            </Badge>
          </motion.div>
          <motion.h1 variants={item} className="mx-auto mt-5 max-w-3xl font-headline text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
            A skill economy that runs on <span className="text-primary">knowledge, not cash</span>
          </motion.h1>
          <motion.p variants={item} className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Every student is rich in one currency they never spend — what they already know.
            SkillEX turns that into the tuition for everything they want to learn. Here is what
            the community has traded so far.
          </motion.p>
        </motion.div>

        {error && (
          <div className="mt-10 rounded-xl border border-border/60 bg-card p-8 text-center text-muted-foreground">
            Impact metrics are warming up. Please refresh in a moment.
          </div>
        )}

        {/* Hero stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={container}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <HeroStat
            icon={PiggyBank}
            value={stats?.tuitionValueSavedUsd ?? 0}
            prefix="$"
            label="Tuition value saved"
            sub="Real learning paid for with skills, not money."
            accent
          />
          <HeroStat
            icon={Repeat}
            value={stats?.skillsExchanged ?? 0}
            label="Skills exchanged"
            sub="Completed peer teaching sessions."
          />
          <HeroStat
            icon={Clock}
            value={stats?.hoursTaught ?? 0}
            suffix="h"
            label="Hours taught"
            sub="Time invested by peers teaching peers."
          />
          <HeroStat
            icon={Users}
            value={stats?.learners ?? 0}
            label="Learners"
            sub="Members both teaching and learning."
          />
        </motion.div>

        {/* Secondary stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={container}
          className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5"
        >
          <MiniStat icon={Award} value={stats?.mentorCertificates ?? 0} label="Certificates" />
          <MiniStat icon={Boxes} value={stats?.skillCircles ?? 0} label="Skill circles" />
          <MiniStat icon={Handshake} value={stats?.connectionsMade ?? 0} label="Connections" />
          <MiniStat icon={MessagesSquare} value={stats?.communityThreads ?? 0} label="Discussions" />
          <MiniStat icon={Sparkles} value={stats?.skillsInCatalog ?? 0} label="Tradable skills" />
        </motion.div>

        {/* The loop story + top skills */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border/60 bg-card p-6 md:p-8"
          >
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-foreground">
              How the loop closes
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Direct skill-swaps rarely work — it is rare that you want exactly what someone else
              has <em>and</em> they want exactly what you have. That is the classic{' '}
              <span className="font-semibold text-foreground">double-coincidence-of-wants</span> problem
              that kills barter economies.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              SkillEX's <span className="font-semibold text-primary">Skill Chain</span> solves it by
              finding <span className="font-semibold text-foreground">circular</span> exchanges:
              A teaches B, B teaches C, C teaches A. No money. No mutual match required. The chain
              closes the loop — and the whole economy stays liquid.
            </p>
            <Button asChild className="mt-6 rounded-xl">
              <Link to="/match">
                See the live Skill Chain <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-card p-6 md:p-8"
          >
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
              Most-taught skills
            </h3>
            <div className="mt-5 space-y-4">
              {topSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Skill supply is being tallied…</p>
              ) : (
                topSkills.map((skill, i) => (
                  <div key={skill.skillId}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">{skill.skillName}</span>
                      <span className="text-xs text-muted-foreground">{skill.count} mentors</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.round((skill.count / maxSkillCount) * 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center md:p-12"
        >
          <h2 className="mx-auto max-w-2xl font-headline text-3xl font-extrabold tracking-tight text-foreground">
            Teach what you know. Learn what you want. Spend nothing.
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl">
              <Link to="/login">Join the skill economy</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl">
              <Link to="/about">How it works</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </MarketingLayout>
  );
}
