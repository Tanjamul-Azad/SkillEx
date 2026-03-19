import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  AlertTriangle,
  BadgeCheck,
  Gavel,
  Flag,
  Users,
  HeartHandshake,
  Eye,
  Ban,
  MessageCircleWarning,
} from 'lucide-react';
import MarketingLayout from '@/components/layout/MarketingLayout';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } },
};

const principles = [
  {
    icon: HeartHandshake,
    title: 'Be Respectful',
    desc: 'Treat every member with the same respect you expect in return. Personal attacks, harassment, and hate speech have no place on SkiilEX.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: BadgeCheck,
    title: 'Be Honest',
    desc: 'Represent your skills accurately. Misleading profiles undermine trust and waste other members\' time. We investigate misrepresentation reports.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Eye,
    title: 'Protect Privacy',
    desc: 'Do not share another member\'s personal or contact information without their explicit consent. Your exchange partner\'s data is theirs alone.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: Ban,
    title: 'No Exploitation',
    desc: 'SkiilEX exists for mutual learning — never for commercial transactions, solicitation, or extracting value without reciprocity.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
];

const zeroToleranceItems = [
  'Sexual harassment or unsolicited explicit content',
  'Racism, xenophobia, homophobia, or any form of discrimination',
  'Threats of violence — online or offline',
  'Impersonation of another person or organisation',
  'Sharing, soliciting, or distributing malware or harmful files',
  'Coordinated manipulation — fake reviews, brigading, spam',
];

const reportSteps = [
  {
    num: '01',
    heading: 'Identify',
    body: 'Tap or click the flag icon ( ⚑ ) on any profile, message, or review. It appears in every user\'s profile menu and alongside each message.',
  },
  {
    num: '02',
    heading: 'Describe',
    body: 'Choose a violation category and add a brief description. Screenshots or evidence you can share help us act faster.',
  },
  {
    num: '03',
    heading: 'Submit',
    body: 'Your report is sent directly to our Trust & Safety queue. Reports are anonymous — the reported user will never know who filed the report.',
  },
  {
    num: '04',
    heading: 'Review',
    body: 'Our team reviews all reports within 48 hours. If the violation is confirmed, action is taken — from a warning to a permanent ban depending on severity.',
  },
];

const outcomes = [
  { label: 'Warning', desc: 'First offences and minor violations. A formal notice is added to the account.' },
  { label: 'Temporary Suspension', desc: 'Repeated violations or moderate severity. Account access suspended for 7–30 days.' },
  { label: 'Permanent Ban', desc: 'Severe or zero-tolerance violations. Account permanently removed. IP banned where appropriate.' },
  { label: 'Law Enforcement Referral', desc: 'Threats of violence, CSAM, or criminal activity. Reported to relevant authorities.' },
];

export default function TrustPage() {
  return (
    <MarketingLayout>
      <div className="relative min-h-screen">
        {/* Ambient glows */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-1/4 h-[500px] w-[600px] rounded-full bg-emerald-600/5 blur-[140px]" />
          <div className="absolute bottom-0 left-1/4 h-[400px] w-[500px] rounded-full bg-secondary/5 blur-[120px]" />
          <div className="absolute inset-0 dot-grid opacity-20 dark:opacity-10" />
        </div>

        {/* ─── Hero ─── */}
        <section className="relative pt-32 pb-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <motion.div variants={container} initial="hidden" animate="visible">
              <motion.div variants={item}>
                <Badge className="mb-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5">
                  Trust & Safety
                </Badge>
              </motion.div>
              <motion.h1 variants={item} className="font-headline text-5xl font-extrabold md:text-6xl mb-5">
                Your safety is{' '}
                <span className="text-gradient">non-negotiable</span>
              </motion.h1>
              <motion.p variants={item} className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                SkiilEX is built on mutual respect and trust. These guidelines and enforcement mechanisms exist to
                protect every member of our community — without exception.
              </motion.p>
            </motion.div>

            {/* Trust badge strip */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 flex flex-wrap justify-center gap-4"
            >
              {[
                { icon: ShieldCheck, label: '48-hour report review' },
                { icon: Eye, label: 'Anonymous reporting' },
                { icon: Gavel, label: 'Zero tolerance enforced' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full glass border border-border/40 px-4 py-2 text-sm font-medium"
                >
                  <Icon className="h-4 w-4 text-emerald-400" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Community Standards ─── */}
        <section id="standards" className="scroll-mt-28 py-20 bg-border/5">
          <div className="container mx-auto max-w-5xl px-4">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <motion.div variants={item}>
                <Badge variant="outline" className="mb-4">Community Standards</Badge>
              </motion.div>
              <motion.h2 variants={item} className="font-headline text-3xl font-bold mb-3">
                Four principles that guide us
              </motion.h2>
              <motion.p variants={item} className="text-muted-foreground max-w-xl mx-auto">
                Every member joins SkiilEX by agreeing to uphold these principles. They aren't rules for the sake of rules —
                they're the foundation that makes peer learning possible.
              </motion.p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid sm:grid-cols-2 gap-6"
            >
              {principles.map(({ icon: Icon, title, desc, color, bg }) => (
                <motion.div
                  key={title}
                  variants={item}
                  className={`rounded-2xl border p-6 ${bg}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border mb-4 ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Zero Tolerance ─── */}
        <section id="zero-tolerance" className="scroll-mt-28 py-20">
          <div className="container mx-auto max-w-4xl px-4">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={item} className="text-center mb-12">
                <Badge variant="outline" className="mb-4 border-rose-500/30 text-rose-400">Zero Tolerance</Badge>
                <h2 className="font-headline text-3xl font-bold mb-3">Absolute limits</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  The following behaviours result in immediate, permanent account removal with no right of appeal —
                  and, where applicable, referral to law enforcement.
                </p>
              </motion.div>
              <motion.div
                variants={item}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8"
              >
                <ul className="space-y-3">
                  {zeroToleranceItems.map((z) => (
                    <li key={z} className="flex items-start gap-3 text-sm">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <span className="text-foreground/80">{z}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─── Reporting ─── */}
        <section id="reporting" className="scroll-mt-28 py-20 bg-border/5">
          <div className="container mx-auto max-w-5xl px-4">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={item} className="text-center mb-14">
                <Badge variant="outline" className="mb-4">How to Report</Badge>
                <h2 className="font-headline text-3xl font-bold mb-3">Reporting in four steps</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  See something wrong? Reporting takes under one minute. All reports are anonymous and reviewed within 48 hours.
                </p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {reportSteps.map((step) => (
                  <motion.div key={step.num} variants={item} className="glass rounded-2xl border border-border/40 p-6">
                    <span className="font-headline text-4xl font-extrabold text-secondary/30">{step.num}</span>
                    <h3 className="font-semibold text-base mt-2 mb-2">{step.heading}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={item} className="mt-10 text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Prefer to contact us directly? Reach our Trust & Safety team at:
                </p>
                <a
                  href="mailto:trust@skiilex.com"
                  className="inline-flex items-center gap-2 rounded-full border border-border/50 glass px-5 py-2.5 text-sm font-medium hover:border-secondary/50 transition-colors"
                >
                  <Flag className="h-4 w-4 text-secondary" />
                  trust@skiilex.com
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─── Enforcement ─── */}
        <section id="enforcement" className="scroll-mt-28 py-20">
          <div className="container mx-auto max-w-4xl px-4">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={item} className="text-center mb-12">
                <Badge variant="outline" className="mb-4">Enforcement</Badge>
                <h2 className="font-headline text-3xl font-bold mb-3">How we handle violations</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Every confirmed violation receives a proportional response. We escalate based on severity and history.
                </p>
              </motion.div>

              <div className="grid sm:grid-cols-2 gap-5">
                {outcomes.map((o, i) => (
                  <motion.div key={o.label} variants={item} className="glass rounded-2xl border border-border/40 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold text-muted-foreground/40 tabular-nums">0{i + 1}</span>
                      <h3 className="font-semibold text-base">{o.label}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{o.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── Appeals CTA ─── */}
        <section className="py-20 bg-border/5">
          <div className="container mx-auto max-w-3xl px-4">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-3xl glass-strong border border-border/40 p-10 text-center"
            >
              <motion.div variants={item}>
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 border border-secondary/20">
                  <MessageCircleWarning className="h-7 w-7 text-secondary" />
                </div>
                <h2 className="font-headline text-2xl font-bold mb-3">Have questions or an appeal?</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                  If you believe an enforcement action was applied incorrectly, you can appeal within 14 days.
                  We review every appeal fairly.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" className="rounded-full font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <a href="mailto:appeals@skiilex.com">Submit an Appeal</a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full font-semibold">
                    <Link to="/community">Community Guidelines</Link>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
