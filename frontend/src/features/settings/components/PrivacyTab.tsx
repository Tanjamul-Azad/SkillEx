import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface PrivacyTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (options: any) => void;
}

export default function PrivacyTab({ toast }: PrivacyTabProps) {
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showOnline: true,
    allowMatchRequests: true,
  });

  const handleSave = () => {
    toast({ title: 'Privacy settings saved', variant: 'success' });
  };

  const privacyItems = [
    { key: 'publicProfile', label: 'Public Profile', desc: 'Your profile is visible to everyone on SkillEx.' },
    { key: 'showOnline', label: 'Show Online Status', desc: 'Others can see when you are active.' },
    { key: 'allowMatchRequests', label: 'Allow Match Requests', desc: 'Let other students send you exchange requests.' },
  ] as const;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
      <div className="p-6 border-b border-white/5 bg-white/5">
        <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Privacy Settings
        </h3>
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Control who can see and contact you.</p>
      </div>
      <div className="p-6 space-y-6">
        {privacyItems.map(({ key, label, desc }) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
            <div>
              <Label className="font-bold text-white text-sm">{label}</Label>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">{desc}</p>
            </div>
            <Switch
              checked={privacy[key]}
              onCheckedChange={(v) => setPrivacy((p) => ({ ...p, [key]: v }))}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-white/10"
            />
          </div>
        ))}
        <Separator className="bg-white/10" />
        <Button
          className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all"
          onClick={handleSave}
        >
          Save Privacy Settings
        </Button>
      </div>
    </div>
  );
}
