import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { adminService, type PendingSkill } from '@/services/adminService';

export default function AdminSkillsPendingPage() {
  const [skills, setSkills] = useState<PendingSkill[]>([]);
  const load = () => adminService.pendingSkills().then(setSkills).catch(() => {});
  useEffect(() => { void load(); }, []);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-3xl font-extrabold">Pending Skill Governance</h1>
      <div className="space-y-3">
        {skills.map((skill) => (
          <div key={skill.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold">{skill.displayName}</p>
                <p className="text-sm text-muted-foreground">{skill.category ?? 'Uncategorized'} · seen {skill.seenCount} times</p>
                {skill.sourceIntent && <p className="mt-1 text-xs text-muted-foreground">{skill.sourceIntent}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => { await adminService.approveSkill(skill.id); await load(); }}>Approve</Button>
                <Button size="sm" variant="outline" onClick={async () => { await adminService.rejectSkill(skill.id, 'Rejected from admin console.'); await load(); }}>Reject</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
