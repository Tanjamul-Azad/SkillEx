import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface NotificationsTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (options: any) => void;
}

export default function NotificationsTab({ toast }: NotificationsTabProps) {
  const [notifications, setNotifications] = useState({
    matchRequests: true,
    sessionReminders: true,
    reviews: true,
    newsletter: false,
    marketing: false,
  });

  const handleSave = () => {
    toast({ title: 'Preferences saved', variant: 'success' });
  };

  const notificationItems = [
    { key: 'matchRequests', label: 'Match Requests', desc: 'When someone wants to exchange skills with you.' },
    { key: 'sessionReminders', label: 'Session Reminders', desc: '30-minute reminders before scheduled sessions.' },
    { key: 'reviews', label: 'Reviews & Ratings', desc: 'When someone leaves you a review.' },
    { key: 'newsletter', label: 'Product Updates', desc: 'New features and platform announcements.' },
    { key: 'marketing', label: 'Marketing Emails', desc: 'Tips, community highlights, and special offers.' },
  ] as const;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
      <div className="p-6 border-b border-border bg-muted/20">
        <h3 className="text-xl font-extrabold font-headline text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notification Preferences
        </h3>
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Choose what you want to be notified about.</p>
      </div>
      <div className="p-6 space-y-6">
        {notificationItems.map(({ key, label, desc }) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-border last:border-0">
            <div>
              <Label className="font-bold text-foreground text-sm">{label}</Label>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">{desc}</p>
            </div>
            <Switch
              checked={notifications[key]}
              onCheckedChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
            />
          </div>
        ))}
        <Separator className="bg-border" />
        <Button
          className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all"
          onClick={handleSave}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
