import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Flag, ScrollText, ClipboardList, FileClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AppBackButton from '@/components/navigation/AppBackButton';

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/rules', label: 'Rules', icon: ScrollText },
  { href: '/admin/skills/pending', label: 'Skills', icon: ClipboardList },
  { href: '/admin/audit', label: 'Audit', icon: FileClock },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border/60 bg-sidebar/95 p-4 shadow-[1px_0_0_0_hsl(var(--border)/0.5)] backdrop-blur-xl lg:block">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 rounded-xl px-2 py-2 text-lg font-extrabold">
          <Shield className="h-5 w-5 text-primary" />
          SkillEX Admin
        </Link>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  active && 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-h-screen p-4 lg:ml-64 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <AppBackButton fallbackTo="/dashboard" className="mb-4" />
          {children}
        </div>
      </main>
    </div>
  );
}
