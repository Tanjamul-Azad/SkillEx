
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserService } from '@/services/userService';
import { api } from '@/services/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  User, Mail, Lock, Bell, Shield, Trash2, Camera,
  CheckCircle2, Eye, EyeOff, Globe, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Schemas ─────────────────────────────────────────────── */
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email.'),
  university: z.string().min(2, 'University name is required.'),
  bio: z.string().max(300, 'Bio cannot exceed 300 characters.').optional(),
});

const passwordSchema = z.object({
  current: z.string().min(1, 'Current password is required.'),
  next: z.string().min(8, 'New password must be at least 8 characters.'),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: "Passwords don't match.", path: ['confirm'] });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

/* ── Sidebar nav ─────────────────────────────────────────── */
const sections = [
  { id: 'profile', label: 'Profile', icon: User },
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
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // Dialog state
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState({
    matchRequests: true,
    sessionReminders: true,
    reviews: true,
    newsletter: false,
    marketing: false,
  });

  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showOnline: true,
    allowMatchRequests: true,
  });

  /* Profile form */
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      university: user?.university ?? '',
      bio: user?.bio ?? '',
    },
  });

  /* Password form */
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const handleProfileSave = async (data: ProfileFormData) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await UserService.updateProfile(user.id, {
        name: data.name,
        university: data.university,
        bio: data.bio ?? '',
      });
      // Refresh in-memory user so the sidebar/header reflect the new name/bio
      await refreshUser();
      toast({ title: 'Profile updated', description: 'Your changes have been saved.', variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not save profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (data: PasswordFormData) => {
    setSavingPassword(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: data.current,
        newPassword: data.next,
      });
      passwordForm.reset();
      toast({ title: 'Password changed', description: 'Your password has been updated.', variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Password change failed',
        description: err instanceof Error ? err.message : 'Could not update password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const charCount = profileForm.watch('bio')?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your account preferences and profile.</p>
        </motion.div>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full shrink-0 lg:w-52"
          >
            <nav className="flex flex-row gap-1 lg:flex-col">
              {sections.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors w-full text-left justify-start h-auto",
                    active === s.id
                      ? 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    , s.id === 'danger' && 'mt-auto text-destructive hover:bg-destructive/10 hover:text-destructive')}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:block">{s.label}</span>
                </Button>
              ))}
            </nav>
          </motion.aside>

          {/* Content */}
          <motion.div
            key={active}
            variants={item}
            initial="hidden"
            animate="visible"
            className="flex-1 space-y-6"
          >
            {/* ── PROFILE ── */}
            {active === 'profile' && (
              <>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4 text-primary" /> Profile Information
                    </CardTitle>
                    <CardDescription>Update your public profile details.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Avatar */}
                    <div className="mb-6 flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                          <AvatarImage src={localAvatar ?? user?.avatar} alt={user?.name} />
                          <AvatarFallback className="text-xl font-bold">{user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button
                          size="icon"
                          onClick={() => setAvatarDialogOpen(true)}
                          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold">{user?.name}</p>
                        <p className="text-muted-foreground">{user?.email}</p>
                        <Badge variant="secondary" className="mt-1 capitalize">{user?.level}</Badge>
                      </div>
                    </div>

                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField control={profileForm.control} name="name" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl><Input {...field} placeholder="Your name" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={profileForm.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl><Input {...field} type="email" placeholder="your@email.com" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={profileForm.control} name="university" render={({ field }) => (
                          <FormItem>
                            <FormLabel>University / Institution</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. BUET, Dhaka University" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={profileForm.control} name="bio" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Tell others a bit about yourself..."
                                className="resize-none h-24"
                              />
                            </FormControl>
                            <div className="flex items-center justify-between">
                              <FormMessage />
                              <span className={`text-xs ${charCount > 280 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {charCount}/300
                              </span>
                            </div>
                          </FormItem>
                        )} />
                        <Button
                          type="submit"
                          variant="gradient"
                          disabled={savingProfile}
                          className="min-w-[140px]"
                        >
                          {savingProfile ? 'Saving...' : <><CheckCircle2 className="mr-2 h-4 w-4" />Save Changes</>}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-4 w-4 text-accent" /> SkillEx Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        { label: 'SkillEx Score', value: user?.skillexScore },
                        { label: 'Sessions Completed', value: user?.sessionsCompleted },
                        { label: 'Rating', value: `${user?.rating} ★` },
                        { label: 'Skills Offered', value: user?.skillsOffered?.length ?? 0 },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl bg-muted/60 border border-border/40 p-4 text-center">
                          <p className="font-headline text-2xl font-black">{value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── SECURITY ── */}
            {active === 'security' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4 text-primary" /> Change Password
                  </CardTitle>
                  <CardDescription>Use a strong password that you don't use elsewhere.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordSave)} className="space-y-4 max-w-md">
                      <FormField control={passwordForm.control} name="current" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input {...field} type={showCurrent ? 'text' : 'password'} placeholder="Your current password" className="pr-10" />
                            </FormControl>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => setShowCurrent((v) => !v)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg"
                            >
                              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={passwordForm.control} name="next" render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input {...field} type={showNext ? 'text' : 'password'} placeholder="Min. 8 characters" className="pr-10" />
                            </FormControl>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => setShowNext((v) => !v)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg"
                            >
                              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={passwordForm.control} name="confirm" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl><Input {...field} type="password" placeholder="Repeat new password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" variant="gradient" disabled={savingPassword} className="min-w-[160px]">
                        {savingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* ── NOTIFICATIONS ── */}
            {active === 'notifications' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4 text-primary" /> Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose what you want to be notified about.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {([
                    { key: 'matchRequests', label: 'Match Requests', desc: 'When someone wants to exchange skills with you.' },
                    { key: 'sessionReminders', label: 'Session Reminders', desc: '30-minute reminders before scheduled sessions.' },
                    { key: 'reviews', label: 'Reviews & Ratings', desc: 'When someone leaves you a review.' },
                    { key: 'newsletter', label: 'Product Updates', desc: 'New features and platform announcements.' },
                    { key: 'marketing', label: 'Marketing Emails', desc: 'Tips, community highlights, and special offers.' },
                  ] as { key: keyof typeof notifications; label: string; desc: string }[]).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 py-2">
                      <div>
                        <Label className="font-medium">{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={notifications[key]}
                        onCheckedChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                      />
                    </div>
                  ))}
                  <Separator />
                  <Button
                    variant="gradient"
                    onClick={() => toast({ title: 'Preferences saved', variant: 'success' })}
                  >
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── PRIVACY ── */}
            {active === 'privacy' && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-primary" /> Privacy Settings
                  </CardTitle>
                  <CardDescription>Control who can see and contact you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {([
                    { key: 'publicProfile', label: 'Public Profile', desc: 'Your profile is visible to everyone on SkillEx.' },
                    { key: 'showOnline', label: 'Show Online Status', desc: 'Others can see when you are active.' },
                    { key: 'allowMatchRequests', label: 'Allow Match Requests', desc: 'Let other students send you exchange requests.' },
                  ] as { key: keyof typeof privacy; label: string; desc: string }[]).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 py-2">
                      <div>
                        <Label className="font-medium">{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={privacy[key]}
                        onCheckedChange={(v) => setPrivacy((p) => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                  <Separator />
                  <Button
                    variant="gradient"
                    onClick={() => toast({ title: 'Privacy settings saved', variant: 'success' })}
                  >
                    Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── DANGER ZONE ── */}
            {active === 'danger' && (
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <Trash2 className="h-4 w-4" /> Danger Zone
                  </CardTitle>
                  <CardDescription>These actions are irreversible. Proceed with caution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                    <div>
                      <p className="font-semibold">Log out of all devices</p>
                      <p className="text-sm text-muted-foreground">Sign out everywhere and revoke all active sessions.</p>
                    </div>
                    <Button variant="outline" className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10" onClick={() => setConfirmLogoutAll(true)}>
                      Log Out
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <div>
                      <p className="font-semibold">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently remove your account and all data.</p>
                    </div>
                    <Button
                      variant="destructive"
                      className="rounded-xl"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Avatar upload dialog ── */}
      <Dialog open={avatarDialogOpen} onOpenChange={(o) => { setAvatarDialogOpen(o); if (!o) setAvatarPreview(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Profile Photo</DialogTitle>
            <DialogDescription>Choose a new photo for your profile.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col items-center gap-4">
            <Avatar className="h-28 w-28 ring-4 ring-primary/20">
              <AvatarImage src={avatarPreview ?? user?.avatar} alt={user?.name} />
              <AvatarFallback className="text-3xl font-bold">{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
            <Button variant="outline" className="w-full" onClick={() => avatarInputRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Choose Photo
            </Button>
          </div>
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setAvatarDialogOpen(false); setAvatarPreview(null); }}>
              Cancel
            </Button>
            <Button
              variant="gradient" disabled={!avatarPreview}
              onClick={() => {
                if (avatarPreview) setLocalAvatar(avatarPreview);
                setAvatarDialogOpen(false);
                setAvatarPreview(null);
                toast({ title: 'Profile photo updated!', description: 'Your new profile photo is now showing.' });
              }}
            >
              Save Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Log out all devices confirm ── */}
      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Log out of all devices?"
        description="You'll be signed out everywhere. You'll need to sign in again on every device."
        confirmLabel="Log out everywhere"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={logout}
      />

      {/* ── Delete account dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) setDeleteConfirmEmail(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Delete Account
            </DialogTitle>
            <DialogDescription>
              This action is <strong>permanent and irreversible</strong>. All your matches, sessions, and data will be erased.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              You are about to permanently delete <strong>{user?.email}</strong> and all associated data.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-delete-email" className="text-sm font-medium">
                Type your email address to confirm
              </Label>
              <Input
                id="confirm-delete-email"
                type="email"
                placeholder={user?.email ?? 'your@email.com'}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmEmail(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmEmail !== user?.email}
              onClick={async () => {
                try {
                  await UserService.deleteAccount();
                  setDeleteDialogOpen(false);
                  setDeleteConfirmEmail('');
                  logout();
                } catch {
                  toast({ title: 'Failed to delete account', description: 'Please try again or contact support.', variant: 'destructive' });
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
