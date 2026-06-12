import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Lock, Bell, Shield, Trash2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// Subcomponents
import ProfileTab from '../components/ProfileTab';
import SkillsTab from '../components/SkillsTab';
import SecurityTab from '../components/SecurityTab';
import NotificationsTab from '../components/NotificationsTab';
import PrivacyTab from '../components/PrivacyTab';
import DangerTab from '../components/DangerTab';

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'skills', label: 'My Skills', icon: BookOpen },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
};

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState(() => {
    const tab = searchParams.get('tab');
    return tab && sections.some(s => s.id === tab) ? tab : 'profile';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && sections.some(s => s.id === tab)) setActive(tab);
  }, [searchParams]);

  return (
    <DashboardLayout>
      <div className="product-page space-y-5">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="product-header">
          <div>
            <h1 className="product-title text-foreground">Settings</h1>
            <p className="product-subtitle text-muted-foreground">
              Manage your account preferences, public profile, skills, security, and privacy from one place.
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full shrink-0 lg:w-56"
          >
            <nav className="product-panel flex h-full flex-row gap-1 overflow-x-auto p-2 custom-scrollbar lg:flex-col bg-background/50 border border-white/5 rounded-2xl">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex w-full items-center justify-start gap-3 rounded-xl border px-3 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-wider transition-colors whitespace-nowrap lg:whitespace-normal group",
                    active === s.id
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/30 hover:text-foreground dark:hover:border-white/10',
                    s.id === 'danger' && 'lg:mt-auto text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                  )}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  <span className="block">{s.label}</span>
                </button>
              ))}
            </nav>
          </motion.aside>

          {/* Content */}
          <motion.div
            key={active}
            variants={item}
            initial="hidden"
            animate="visible"
            className="flex-1 min-w-0"
          >
            {active === 'profile' && (
              <ProfileTab user={user} refreshUser={refreshUser} toast={toast} />
            )}
            {active === 'skills' && (
              <SkillsTab user={user} refreshUser={refreshUser} toast={toast} />
            )}
            {active === 'security' && (
              <SecurityTab user={user} refreshUser={refreshUser} toast={toast} />
            )}
            {active === 'notifications' && (
              <NotificationsTab toast={toast} />
            )}
            {active === 'privacy' && (
              <PrivacyTab toast={toast} />
            )}
            {active === 'danger' && (
              <DangerTab user={user} logout={logout} toast={toast} />
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
