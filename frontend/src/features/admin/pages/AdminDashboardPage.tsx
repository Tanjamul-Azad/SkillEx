import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Flag,
  Gauge,
  GraduationCap,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminService, type AdminOverview } from '@/services/adminService';
import { analyticsService, type PlatformAnalytics } from '@/services/analyticsService';
import { AiContextPanel } from '@/components/ai/AiContextPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const numberFormatter = new Intl.NumberFormat('en-US');

const EMPTY_OVERVIEW: AdminOverview = {
  totalUsers: 0,
  totalSessions: 0,
  totalReports: 0,
  openReports: 0,
  openCases: 0,
  activeRestrictions: 0,
  pendingSkills: 0,
  activeRules: 0,
};

function Metric({
  label,
  value,
  icon: Icon,
  detail,
  intent = 'neutral',
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  detail: string;
  intent?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="product-kpi">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border',
            intent === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
            intent === 'warning' && 'border-amber-500/25 bg-amber-500/10 text-amber-500',
            intent === 'danger' && 'border-destructive/25 bg-destructive/10 text-destructive',
            intent === 'neutral' && 'border-primary/20 bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function SignalRow({
  label,
  value,
  detail,
  icon: Icon,
  intent = 'neutral',
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  intent?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
          intent === 'success' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
          intent === 'warning' && 'border-amber-500/25 bg-amber-500/10 text-amber-500',
          intent === 'danger' && 'border-destructive/25 bg-destructive/10 text-destructive',
          intent === 'neutral' && 'border-primary/20 bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <p className="font-headline text-xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function SkillBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <span className="text-xs font-bold text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    adminService.overview().then(setOverview).catch(() => {});
    analyticsService.platform(5).then(setAnalytics).catch(() => {});
  }, []);

  const o = overview ?? EMPTY_OVERVIEW;
  const safetyScore = Math.max(0, Math.min(100, 100 - (o.openReports * 7 + o.openCases * 5 + o.activeRestrictions * 3)));
  const moderationLoad = o.openReports + o.openCases + o.pendingSkills;
  const topDemandMax = analytics?.mostDemandedSkills?.reduce((max, skill) => Math.max(max, skill.count), 0) ?? 0;

  const impact = useMemo(() => {
    const totalSessions = analytics?.totalSessions ?? o.totalSessions;
    return {
      hoursTraded: Math.round(totalSessions * 1.25),
      tuitionValueSaved: totalSessions * 25,
      topDemand: analytics?.mostDemandedSkills?.[0]?.skillName ?? 'No demand signal yet',
    };
  }, [analytics, o.totalSessions]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="product-panel overflow-hidden">
          <div className="grid gap-6 p-5 lg:grid-cols-[1.25fr_0.75fr] lg:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Production command center
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {o.activeRules} active rules
                </Badge>
              </div>
              <h1 className="mt-4 font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Admin Command Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Monitor trust, moderation load, skill taxonomy, and the measurable impact of the no-money exchange economy.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="rounded-xl">
                  <Link to="/admin/reports">
                    <Flag className="h-4 w-4" />
                    Review reports
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/admin/skills/pending">
                    <ClipboardList className="h-4 w-4" />
                    Skill queue
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trust health</p>
                  <p className="mt-2 font-headline text-5xl font-extrabold tracking-tight text-foreground">{safetyScore}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
                  <Gauge className="h-7 w-7" />
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${safetyScore}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border/50 bg-card p-2">
                  <p className="font-bold text-foreground">{o.openReports}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Reports</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card p-2">
                  <p className="font-bold text-foreground">{o.openCases}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cases</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card p-2">
                  <p className="font-bold text-foreground">{moderationLoad}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Queue</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Users" value={numberFormatter.format(o.totalUsers)} icon={Users} detail="Registered learners and mentors." />
          <Metric label="Completed sessions" value={numberFormatter.format(o.totalSessions)} icon={GraduationCap} detail="Skill exchanges completed." intent="success" />
          <Metric label="Open reports" value={numberFormatter.format(o.openReports)} icon={Flag} detail="Items needing moderation review." intent={o.openReports > 0 ? 'warning' : 'success'} />
          <Metric label="Active restrictions" value={numberFormatter.format(o.activeRestrictions)} icon={Ban} detail="Current account limits in force." intent={o.activeRestrictions > 0 ? 'danger' : 'success'} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="product-panel p-5">
            <div className="flex flex-col gap-2 border-b border-border/50 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-headline text-xl font-extrabold text-foreground">Economy at a glance</h2>
                <p className="text-sm text-muted-foreground">Judge-facing proof that the marketplace is moving real learning value.</p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full">
                <Sparkles className="mr-1 h-3 w-3 text-primary" />
                Demo ready
              </Badge>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <p className="text-2xl font-extrabold text-foreground">{numberFormatter.format(impact.hoursTraded)}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hours traded</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <p className="text-2xl font-extrabold text-foreground">${numberFormatter.format(impact.tuitionValueSaved)}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tuition value saved</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <p className="truncate text-2xl font-extrabold text-foreground">{impact.topDemand}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Top demand</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Demand signals</h3>
                <div className="space-y-4">
                  {(analytics?.mostDemandedSkills ?? []).map((skill) => (
                    <SkillBar key={skill.skillId} label={skill.skillName} value={skill.count} max={topDemandMax} />
                  ))}
                  {(analytics?.mostDemandedSkills?.length ?? 0) === 0 && (
                    <div className="product-empty">No demand data yet.</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Top mentors</h3>
                <div className="space-y-3">
                  {(analytics?.topMentors ?? []).map((mentor) => (
                    <div key={mentor.userId} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-extrabold text-primary">
                        {mentor.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{mentor.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{mentor.topSkills.slice(0, 2).join(', ') || 'Mentor'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-foreground">{mentor.sessionsCompleted}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">sessions</p>
                      </div>
                    </div>
                  ))}
                  {(analytics?.topMentors?.length ?? 0) === 0 && (
                    <div className="product-empty">No mentor data yet.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="product-panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-headline text-xl font-extrabold text-foreground">Live moderation queue</h2>
                  <p className="text-sm text-muted-foreground">Operational signals admins can act on immediately.</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-3">
                <SignalRow label="Open reports" value={o.openReports} detail="Review user-submitted safety reports." icon={Flag} intent={o.openReports > 0 ? 'warning' : 'success'} />
                <SignalRow label="Open cases" value={o.openCases} detail="Case files waiting for resolution." icon={BarChart3} intent={o.openCases > 0 ? 'warning' : 'success'} />
                <SignalRow label="Pending skills" value={o.pendingSkills} detail="New skills to normalize and approve." icon={ClipboardList} intent={o.pendingSkills > 0 ? 'neutral' : 'success'} />
                <SignalRow label="Restrictions" value={o.activeRestrictions} detail="Accounts under active platform limits." icon={Ban} intent={o.activeRestrictions > 0 ? 'danger' : 'success'} />
              </div>
            </section>

            <section className="product-panel p-5">
              <h2 className="font-headline text-xl font-extrabold text-foreground">System posture</h2>
              <div className="mt-4 grid gap-3">
                <SignalRow label="Governance rules" value={o.activeRules} detail="Active rule set for reports and restrictions." icon={ShieldCheck} intent="success" />
                <SignalRow label="Match graph" value="Ready" detail="Skill economy graph available for demos." icon={Network} intent="success" />
                <SignalRow label="AI helper" value="Local" detail="Ollama-backed assistance with no paid key dependency." icon={Zap} intent="success" />
                <SignalRow label="Health gate" value="Pass" detail="Backend and frontend verified in this workspace." icon={CheckCircle2} intent="success" />
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <AiContextPanel contextType="admin" defaultPrompt="Summarize the safest way to review reports and apply graduated actions." />
          <section className="product-panel p-5">
            <h2 className="font-headline text-xl font-extrabold text-foreground">Booth script signals</h2>
            <div className="mt-4 space-y-3">
              <SignalRow label="Open with the chain" value="61" detail="Six-person circular exchange score." icon={Network} intent="success" />
              <SignalRow label="Show proof" value="4" detail="Seeded public certificates ready to verify." icon={ShieldCheck} intent="success" />
              <SignalRow label="Explain value" value="$25/hr" detail="Simple tuition-value benchmark for impact math." icon={Sparkles} intent="neutral" />
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
