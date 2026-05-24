import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { moderationService, type ModerationCase } from '@/services/moderationService';

export default function AdminReportsPage() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [selected, setSelected] = useState<ModerationCase | null>(null);
  const [actionType, setActionType] = useState('WARN');
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState(72);

  const load = () => moderationService.cases(undefined, 0, 50).then((page) => {
    setCases(page.content ?? []);
    setSelected((page.content ?? [])[0] ?? null);
  }).catch(() => {});

  useEffect(() => {
    void load();
  }, []);

  const apply = async () => {
    if (!selected || !reason.trim()) return;
    await moderationService.applyAction({
      caseId: selected.id,
      targetUserId: selected.targetUserId,
      actionType,
      severity: selected.severity,
      reason,
      durationHours: ['BAN_ACCOUNT', 'NO_ACTION'].includes(actionType) ? undefined : durationHours,
    });
    setReason('');
    await load();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold">Moderation Queue</h1>
        <p className="text-muted-foreground">Review reports, AI suggestions, and apply human-approved graduated actions.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
        <div className="space-y-3">
          {cases.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="w-full rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{item.title}</p>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{item.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              <p className="mt-2 text-xs text-primary">{item.severity} · AI suggests {item.aiRecommendedAction ?? 'review'}</p>
            </button>
          ))}
        </div>

        <section className="rounded-2xl border bg-card p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">{selected.title}</h2>
                <p className="text-sm text-muted-foreground">Target: {selected.targetUserName ?? selected.targetUserId ?? 'content only'}</p>
                {selected.targetUserId && (
                  <Link className="text-xs font-semibold text-primary" to={`/admin/users/${selected.targetUserId}`}>View violation history</Link>
                )}
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">AI moderation assistant</p>
                <p className="mt-2 text-sm text-muted-foreground">{selected.aiSummary}</p>
              </div>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NO_ACTION', 'WARN', 'HIDE_CONTENT', 'REMOVE_CONTENT', 'RESTRICT_POSTING', 'RESTRICT_MESSAGING', 'SUSPEND_ACCOUNT', 'BAN_ACCOUNT'].map((action) => (
                    <SelectItem key={action} value={action}>{action.split('_').join(' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!['BAN_ACCOUNT', 'NO_ACTION'].includes(actionType) && (
                <Input type="number" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} placeholder="Duration hours" />
              )}
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Admin decision note and evidence summary" />
              <Button onClick={apply} disabled={!reason.trim()} className="w-full">Apply action</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No moderation cases yet.</p>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
