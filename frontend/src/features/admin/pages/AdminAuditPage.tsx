import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminService, type AdminAuditLog } from '@/services/adminService';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  useEffect(() => {
    adminService.auditLogs(0, 50).then((page) => setLogs(page.content ?? [])).catch(() => {});
  }, []);
  return (
    <AdminLayout>
      <h1 className="mb-6 text-3xl font-extrabold">Admin Audit Trail</h1>
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">{log.action}</p>
              <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <p className="text-sm text-muted-foreground">{log.adminName} · {log.entityType} {log.entityId}</p>
            {log.details && <p className="mt-2 text-sm">{log.details}</p>}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
