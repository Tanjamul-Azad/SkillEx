import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService, type PlatformRule } from '@/services/adminService';

type RuleForm = {
  code: string;
  title: string;
  category: string;
  description: string;
  severity: PlatformRule['severity'];
  defaultAction: string;
};

export default function AdminRulesPage() {
  const [rules, setRules] = useState<PlatformRule[]>([]);
  const [form, setForm] = useState<RuleForm>({ code: '', title: '', category: 'Safety', description: '', severity: 'LOW', defaultAction: 'WARN' });

  const load = () => adminService.rules().then(setRules).catch(() => {});
  useEffect(() => { void load(); }, []);

  const create = async () => {
    await adminService.createRule(form);
    setForm({ code: '', title: '', category: 'Safety', description: '', severity: 'LOW', defaultAction: 'WARN' });
    await load();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold">Rules & Policy</h1>
        <p className="text-muted-foreground">Define the rules admins use for consistent moderation.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{rule.title}</h2>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{rule.severity}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{rule.code} · default {rule.defaultAction.split('_').join(' ')}</p>
            </div>
          ))}
        </div>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">Create rule</h2>
          <div className="space-y-3">
            <Input placeholder="Code, e.g. HARASSMENT" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Select value={form.severity} onValueChange={(severity) => setForm({ ...form, severity: severity as PlatformRule['severity'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.defaultAction} onValueChange={(defaultAction) => setForm({ ...form, defaultAction })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['WARN', 'RESTRICT_POSTING', 'RESTRICT_MESSAGING', 'SUSPEND_ACCOUNT', 'BAN_ACCOUNT', 'NO_ACTION'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={create} disabled={!form.code || !form.title} className="w-full">Create rule</Button>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
