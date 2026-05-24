import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Flag, Ban, ClipboardList, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminService, type AdminOverview } from '@/services/adminService';
import { analyticsService, type PlatformAnalytics } from '@/services/analyticsService';
import { AiContextPanel } from '@/components/ai/AiContextPanel';

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
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

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Command Center</h1>
        <p className="text-muted-foreground">Monitor safety, governance, platform impact, and AI-assisted moderation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Users" value={overview?.totalUsers ?? 0} icon={Users} />
        <Metric label="Completed sessions" value={overview?.totalSessions ?? 0} icon={ShieldCheck} />
        <Metric label="Open reports" value={overview?.openReports ?? 0} icon={Flag} />
        <Metric label="Active restrictions" value={overview?.activeRestrictions ?? 0} icon={Ban} />
        <Metric label="Pending skills" value={overview?.pendingSkills ?? 0} icon={ClipboardList} />
        <Metric label="Open cases" value={overview?.openCases ?? 0} icon={Flag} />
        <Metric label="Active rules" value={overview?.activeRules ?? 0} icon={ShieldCheck} />
        <Metric label="Total reports" value={overview?.totalReports ?? 0} icon={BarChart3} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">Project Impact</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-2xl font-bold">{analytics?.totalUsers ?? 0}</p>
              <p className="text-xs text-muted-foreground">registered learners</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics?.totalSessions ?? 0}</p>
              <p className="text-xs text-muted-foreground">completed exchanges</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics?.mostDemandedSkills?.[0]?.skillName ?? 'Skills'}</p>
              <p className="text-xs text-muted-foreground">top demand signal</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Most demanded</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {analytics?.mostDemandedSkills?.map((s) => <li key={s.skillId}>{s.skillName} · {s.count}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Top mentors</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {analytics?.topMentors?.map((m) => <li key={m.userId}>{m.name} · {m.sessionsCompleted} sessions</li>)}
              </ul>
            </div>
          </div>
        </section>
        <AiContextPanel contextType="admin" defaultPrompt="Summarize the safest way to review reports and apply graduated actions." />
      </div>
    </AdminLayout>
  );
}
