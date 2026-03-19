import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Users, Target, Lightbulb, Heart,
  Zap, Globe, BookOpen, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const values = [
  {
    icon: Globe,
    color: 'bg-primary/10 text-primary',
    title: 'Radically Accessible',
    desc: 'Quality education should never be gated behind money. We built SkiilEX to be free — forever — for students everywhere.',
  },
  {
    icon: Heart,
    color: 'bg-pink-500/10 text-pink-400',
    title: 'Community First',
    desc: 'Every feature we build starts with a single question: does this make our community stronger? People over metrics.',
  },
  {
    icon: Lightbulb,
    color: 'bg-amber-500/10 text-amber-400',
    title: 'Learn by Teaching',
    desc: "The best way to master a skill is to teach it. We designed the whole platform around this proven truth.",
  },
  {
    icon: Shield,
    color: 'bg-secondary/10 text-secondary',
    title: 'Trust & Safety',
    desc: 'Verified profiles, transparent reviews, and a zero-tolerance policy for bad actors keep our community safe.',
  },
];

const team = [
  { name: 'Tanjamul Azad', role: 'Co-founder & CEO', avatar: 'https://picsum.photos/seed/team1/100/100', tag: 'Visionary' },
  { name: 'Arya Sen', role: 'Co-founder & CTO', avatar: 'https://picsum.photos/seed/team2/100/100', tag: 'Engineer' },
  { name: 'Rafia Islam', role: 'Head of Design', avatar: 'https://picsum.photos/seed/team3/100/100', tag: 'Designer' },
  { name: 'Dev Chowdhury', role: 'Head of Community', avatar: 'https://picsum.photos/seed/team4/100/100', tag: 'Community' },
];

const milestones = [
  { year: '2024', label: 'Founded at BRAC University', desc: 'Started as a side project between two CS students who were tired of expensive tutors.' },
  { year: '2024', label: 'First 100 exchanges', desc: 'Word spread fast. Within 3 months, 100 successful skill swaps happened on the platform.' },
  { year: '2025', label: '150 universities joined', desc: 'Expanded beyond Bangladesh — students from 12 countries joined within the year.' },
  { year: '2026', label: '12,000+ students & counting', desc: 'Today SkiilEX is the largest peer-to-peer skill exchange platform for students in South Asia.' },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      <div className="relative min-h-screen">
        {/* Background blobs */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 -left-40 h-[500px] w-[500px] rounded-full bg-secondary/8 blur-[100px]" />
          <div className="absolute inset-0 dot-grid opacity-30 dark:opacity-15" />
        </div>

        <div className="container mx-auto max-w-5xl px-4 py-28">

          {/* Hero */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <motion.div variants={item}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm">
                Our Story
              </Badge>
            </motion.div>
            <motion.h1
              variants={item}
              className="font-headline text-5xl font-extrabold tracking-tight md:text-6xl lg:text-[4.5rem] text-balance leading-[1.05]"
            >
              We're building the future
              <br />
              <span className="text-gradient">of peer learning.</span>
            </motion.h1>
            <motion.p
              variants={item}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
            >
              SkiilEX was born in a university dorm room with a simple idea — every student has a skill
              someone else wants. Why should money stand in the middle?
            </motion.p>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              { value: '12,000+', label: 'Active Students' },
              { value: '8,500+', label: 'Exchanges Done' },
              { value: '150+', label: 'Universities' },
              { value: '4.9★', label: 'Avg Rating' },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={item}
                className="rounded-2xl glass border border-border/40 p-6 text-center"
              >
                <p className="font-headline text-3xl font-black text-gradient">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Mission */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-24"
          >
            <div className="rounded-3xl glass border border-primary/20 p-10 md:p-14 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <motion.div variants={item} className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Our Mission</span>
                </motion.div>
                <motion.blockquote
                  variants={item}
                  className="font-headline text-2xl md:text-3xl font-bold text-balance leading-snug"
                >
                  "To eliminate financial barriers to learning by connecting students who teach
                  what they know and learn what they need — completely free."
                </motion.blockquote>
                <motion.p variants={item} className="mt-6 text-muted-foreground leading-relaxed max-w-2xl">
                  We believe that knowledge is the only true currency. Every student has something valuable to offer.
                  SkiilEX is the marketplace where that value is recognised, exchanged, and multiplied — with zero
                  dollars changing hands.
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Values */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-24"
          >
            <motion.div variants={item} className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">What drives us</p>
              <h2 className="font-headline text-3xl font-extrabold md:text-4xl">Our Core Values</h2>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2">
              {values.map((v) => (
                <motion.div
                  key={v.title}
                  variants={item}
                  whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
                  className="rounded-2xl glass border border-border/40 p-7 hover:border-primary/30 transition-colors"
                >
                  <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-2xl mb-5', v.color)}>
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-headline text-lg font-bold mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-24"
          >
            <motion.div variants={item} className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">How we got here</p>
              <h2 className="font-headline text-3xl font-extrabold md:text-4xl">Our Journey</h2>
            </motion.div>
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent sm:left-[30px]" />
              {milestones.map((m, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="relative flex gap-6 pb-10 last:pb-0"
                >
                  {/* Dot */}
                  <div className="relative shrink-0 flex h-11 w-11 sm:h-[60px] sm:w-[60px] items-center justify-center rounded-full bg-primary/10 border border-primary/30 z-10">
                    <span className="font-headline text-xs font-black text-primary">{m.year}</span>
                  </div>
                  {/* Content */}
                  <div className="pt-2">
                    <h3 className="font-headline font-bold text-base">{m.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Team */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-24"
          >
            <motion.div variants={item} className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">The people</p>
              <h2 className="font-headline text-3xl font-extrabold md:text-4xl">Meet the Team</h2>
              <p className="mt-3 text-muted-foreground max-w-md mx-auto">
                A small but passionate group of students and builders who believe knowledge should be free.
              </p>
            </motion.div>
            <div className="grid gap-5 grid-cols-2 md:grid-cols-4">
              {team.map((member) => (
                <motion.div
                  key={member.name}
                  variants={item}
                  whileHover={{ y: -5, transition: { type: 'spring', stiffness: 300 } }}
                  className="rounded-2xl glass border border-border/40 p-6 text-center hover:border-primary/30 transition-colors"
                >
                  <div className="relative inline-block mb-4">
                    <Avatar className="h-16 w-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-background mx-auto">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      {member.tag}
                    </span>
                  </div>
                  <p className="font-headline font-bold text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            className="mt-24 rounded-3xl glass border border-primary/20 p-12 text-center relative overflow-hidden"
          >
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <motion.div variants={item} className="relative z-10">
              <BookOpen className="h-10 w-10 text-primary mx-auto mb-5" />
              <h2 className="font-headline text-3xl font-extrabold mb-3">Join the movement</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Thousands of students are already trading skills. Your next lesson — and your first student — is waiting.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild variant="gradient" size="lg" className="rounded-2xl h-13 px-8">
                  <Link to="/login?tab=register">
                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-2xl h-13 px-8 border-border/50">
                  <Link to="/community">Explore Community</Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </MarketingLayout>
  );
}
