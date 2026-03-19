import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Code, Palette, Users, MessageSquare, ArrowRight,
  Rocket, Heart, Coffee, Globe, MapPin, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import MarketingLayout from '@/components/layout/MarketingLayout';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } },
};

const perks = [
  { icon: Globe, title: 'Remote-first', desc: 'Contribute from anywhere in the world. Async-friendly culture.' },
  { icon: Rocket, title: 'Ship fast', desc: "Your work goes live immediately. No bureaucracy, no waiting." },
  { icon: Heart, title: 'Meaningful impact', desc: 'Directly help thousands of students learn affordably.' },
  { icon: Coffee, title: 'Learn everything', desc: 'Work across the full stack. Grow faster than any classroom.' },
];

const openRoles = [
  {
    title: 'Frontend Engineer',
    icon: Code,
    color: 'bg-primary/10 text-primary border-primary/20',
    type: 'Volunteer Contributor',
    location: 'Remote',
    description:
      'Help build our React/TypeScript frontend. Experience with Tailwind CSS, Framer Motion, and component-driven architecture is a plus.',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
  },
  {
    title: 'UX / Product Designer',
    icon: Palette,
    color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    type: 'Volunteer Contributor',
    location: 'Remote',
    description:
      'Design flows, components, and features that make skill exchange feel intuitive and delightful for students worldwide.',
    skills: ['Figma', 'User Research', 'Design Systems', 'Prototyping'],
  },
  {
    title: 'Backend Engineer',
    icon: Zap,
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    type: 'Volunteer Contributor',
    location: 'Remote',
    description:
      'Work on our Spring Boot API — auth, matching algorithm, exchange management, and real-time features.',
    skills: ['Java', 'Spring Boot', 'PostgreSQL', 'REST APIs'],
  },
  {
    title: 'Community Manager',
    icon: Users,
    color: 'bg-secondary/10 text-secondary border-secondary/20',
    type: 'Volunteer Contributor',
    location: 'Remote / BD',
    description:
      'Grow and nurture our student community. Moderate the platform, create content, and help onboard new members.',
    skills: ['Communication', 'Social Media', 'Event Planning', 'Student Networks'],
  },
];

function RoleCard({ role }: { role: typeof openRoles[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      variants={item}
      className="rounded-2xl glass border border-border/40 overflow-hidden hover:border-primary/25 transition-colors"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-6 flex items-start justify-between gap-4"
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className={cn('shrink-0 flex h-11 w-11 items-center justify-center rounded-2xl border', role.color)}>
            <role.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-headline font-bold text-base">{role.title}</h3>
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                {role.type}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{role.location}</span>
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="px-6 pb-6 border-t border-border/30"
        >
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{role.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {role.skills.map((s) => (
              <span key={s} className="rounded-full bg-muted/40 border border-border/40 px-3 py-1 text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
          <Button
            asChild
            variant="gradient"
            className="mt-5 rounded-xl h-10 px-5 text-sm"
          >
            <a href={`mailto:careers@skiilex.com?subject=Application: ${role.title}`}>
              Apply via Email <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function CareersPage() {
  return (
    <MarketingLayout>
      <div className="relative min-h-screen">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 -left-40 h-[500px] w-[500px] rounded-full bg-accent/8 blur-[100px]" />
          <div className="absolute inset-0 dot-grid opacity-30 dark:opacity-15" />
        </div>

        <div className="container mx-auto max-w-4xl px-4 py-28">

          {/* Hero */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <motion.div variants={item}>
              <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 text-sm">
                We're growing
              </Badge>
            </motion.div>
            <motion.h1
              variants={item}
              className="font-headline text-5xl font-extrabold tracking-tight md:text-6xl text-balance leading-[1.05]"
            >
              Help us make learning{' '}
              <span className="text-gradient">free for everyone.</span>
            </motion.h1>
            <motion.p
              variants={item}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
            >
              SkiilEX is a student-built, student-run platform. We're a small team with a big mission —
              and we're looking for passionate contributors to help us grow.
            </motion.p>
          </motion.div>

          {/* Honest note */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mt-14"
          >
            <motion.div
              variants={item}
              className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex gap-4"
            >
              <Coffee className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-300 mb-1">A note from us</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  SkiilEX is currently pre-revenue and entirely volunteer-powered. All open roles are unpaid
                  contributor positions. We offer real ownership, learning at speed, and the satisfaction of
                  building something genuinely useful for students. If you're motivated by impact over paychecks,
                  we'd love to hear from you.
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Perks */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-20"
          >
            <motion.div variants={item} className="text-center mb-10">
              <h2 className="font-headline text-3xl font-extrabold">Why contribute?</h2>
            </motion.div>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
              {perks.map((p) => (
                <motion.div
                  key={p.title}
                  variants={item}
                  className="rounded-2xl glass border border-border/40 p-6 text-center hover:border-primary/30 transition-colors"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 mb-4 mx-auto">
                    <p.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Open roles */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-20"
          >
            <motion.div variants={item} className="flex items-baseline justify-between mb-8">
              <h2 className="font-headline text-3xl font-extrabold">Open Positions</h2>
              <span className="text-sm text-muted-foreground">{openRoles.length} roles</span>
            </motion.div>
            <div className="space-y-4">
              {openRoles.map((role) => (
                <RoleCard key={role.title} role={role} />
              ))}
            </div>
          </motion.div>

          {/* General application */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            className="mt-16 rounded-3xl glass border border-primary/20 p-10 text-center relative overflow-hidden"
          >
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <motion.div variants={item} className="relative z-10">
              <MessageSquare className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="font-headline text-2xl font-extrabold mb-2">Don't see your role?</h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
                We're always open to passionate people. Send us a message about what you can
                bring to SkiilEX.
              </p>
              <Button asChild variant="gradient" className="rounded-2xl px-7">
                <a href="mailto:careers@skiilex.com?subject=General Application">
                  Send a general application <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </MarketingLayout>
  );
}
