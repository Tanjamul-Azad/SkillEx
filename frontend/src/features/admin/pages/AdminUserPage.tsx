import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { moderationService, type ModerationAction } from '@/services/moderationService';

export default function AdminUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const [actions, setActions] = useState<ModerationAction[]>([]);
  useEffect(() => {
    if (userId) moderationService.userActions(userId, 0, 50).then((page) => setActions(page.content ?? [])).catch(() => {});
  }, [userId]);
  return (
    <AdminLayout>
      <h1 className="mb-2 text-3xl font-extrabold">Violation History</h1>
      <p className="mb-6 text-muted-foreground">User ID: {userId}</p>
      <div className="space-y-3">
        {actions.length === 0 ? <p className="text-sm text-muted-foreground">No moderation actions recorded.</p> : actions.map((action) => (
          <div key={action.id} className="rounded-2xl border bg-card p-4">
            <p className="font-bold">{action.actionType.split('_').join(' ')} · {action.severity}</p>
            <p className="mt-1 text-sm text-muted-foreground">{action.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">By {action.adminName} on {new Date(action.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
