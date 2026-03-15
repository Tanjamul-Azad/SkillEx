
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { BookOpen, Sparkles, X, Plus, Loader2 } from 'lucide-react';
import { SkillService, type SkillIntentInterpretResponse, type SkillIntentSuggestion } from '@/services/skillService';
import type { Skill } from '@/types';
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
  { id: 'skills', label: 'My Skills', icon: BookOpen },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

const LEVEL_DISPLAY: Record<string, string> = {
  BEGINNER: 'Beginner',
  MODERATE: 'Moderate',
  EXPERT: 'Expert',
  Beginner: 'Beginner',
  Moderate: 'Moderate',
  Expert: 'Expert',
};

const LEVEL_OPTIONS = ['BEGINNER', 'MODERATE', 'EXPERT'] as const;
const SKILL_TYPE_LABEL: Record<'offered' | 'wanted', string> = {
  offered: 'Skills I Teach',
  wanted: 'Skills I Want to Learn',
};

const normalizeLevel = (level?: string): 'BEGINNER' | 'MODERATE' | 'EXPERT' => {
  const upper = (level ?? 'MODERATE').toUpperCase();
  if (upper === 'BEGINNER' || upper === 'MODERATE' || upper === 'EXPERT') return upper;
  return 'MODERATE';
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
};

export default function SettingsPage() {
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
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // My Skills state
  const [skillTeachText, setSkillTeachText] = useState('');
  const [skillLearnText, setSkillLearnText] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<SkillIntentInterpretResponse | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);
  const [removingSkillId, setRemovingSkillId] = useState<string | null>(null);
  const [skillCatalog, setSkillCatalog] = useState<Skill[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualType, setManualType] = useState<'offered' | 'wanted'>('offered');
  const [manualLevel, setManualLevel] = useState<'BEGINNER' | 'MODERATE' | 'EXPERT'>('MODERATE');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [editingSkillKey, setEditingSkillKey] = useState<string | null>(null);
  const [editingSkillLevel, setEditingSkillLevel] = useState<'BEGINNER' | 'MODERATE' | 'EXPERT'>('MODERATE');
  const [savingEditSkillKey, setSavingEditSkillKey] = useState<string | null>(null);

  /** Resize + compress an image data-URL to max 256×256 JPEG at 75% quality (~10-20 KB) */
  const compressImage = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    });

  const handleInterpretSkills = useCallback(async () => {
    if (!skillTeachText.trim() && !skillLearnText.trim()) return;
    setIsInterpreting(true);
    try {
      const result = await SkillService.interpretIntent({
        teachText: skillTeachText || undefined,
        learnText: skillLearnText || undefined,
      });
      setInterpretation(result);
      if (result.teach?.primary || result.learn?.primary) {
        toast({ title: 'AI suggestions ready', description: 'Review below and click Add to confirm.', variant: 'success' });
      } else {
        toast({ title: 'No match found', description: 'Try rephrasing or pick manually.', variant: 'destructive' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Suggestion failed', description: 'Could not interpret text right now.' });
    } finally {
      setIsInterpreting(false);
    }
  }, [skillTeachText, skillLearnText, toast]);

  const handleAddSkill = useCallback(async (suggestion: SkillIntentSuggestion, type: 'offered' | 'wanted') => {
    const currentSkillIds = new Set((type === 'offered' ? (user?.skillsOffered ?? []) : (user?.skillsWanted ?? [])).map((s) => s.id));
    if (currentSkillIds.has(suggestion.skillId)) {
      toast({
        title: 'Already added',
        description: `"${suggestion.skillName}" is already in ${SKILL_TYPE_LABEL[type]}.`,
      });
      return;
    }

    setAddingSkill(true);
    try {
      await UserService.addSkill(suggestion.skillId, type, 'MODERATE');
      await refreshUser();
      toast({ title: `"${suggestion.skillName}" added!`, variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Try again.';
      if (typeof msg === 'string' && /(already|exists|duplicate)/i.test(msg)) {
        toast({
          title: 'Already added',
          description: `"${suggestion.skillName}" is already in ${SKILL_TYPE_LABEL[type]}.`,
        });
      } else {
        toast({ variant: 'destructive', title: 'Could not add skill', description: msg });
      }
    } finally {
      setAddingSkill(false);
    }
  }, [refreshUser, toast, user?.skillsOffered, user?.skillsWanted]);

  const handleRemoveSkill = useCallback(async (skillId: string, type: 'offered' | 'wanted') => {
    setRemovingSkillId(skillId);
    try {
      await UserService.removeSkill(skillId, type);
      await refreshUser();
      toast({ title: 'Skill removed', variant: 'success' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not remove skill', description: err instanceof Error ? err.message : 'Try again.' });
    } finally {
      setRemovingSkillId(null);
    }
  }, [refreshUser, toast]);

  useEffect(() => {
    let mounted = true;
    setCatalogLoading(true);
    SkillService.getAll()
      .then((skills) => {
        if (mounted) setSkillCatalog(Array.isArray(skills) ? skills : []);
      })
      .catch(() => {
        if (mounted) setSkillCatalog([]);
      })
      .finally(() => {
        if (mounted) setCatalogLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const existingTargetSkillIds = useMemo(() => {
    const source = manualType === 'offered' ? (user?.skillsOffered ?? []) : (user?.skillsWanted ?? []);
    return new Set(source.map((s) => s.id));
  }, [manualType, user?.skillsOffered, user?.skillsWanted]);

  const filteredCatalog = useMemo(() => {
    const query = manualQuery.trim().toLowerCase();
    return skillCatalog
      .filter((skill) => !existingTargetSkillIds.has(skill.id))
      .filter((skill) => {
        if (!query) return true;
        return skill.name.toLowerCase().includes(query) || skill.category.toLowerCase().includes(query);
      })
      .slice(0, 12);
  }, [existingTargetSkillIds, manualQuery, skillCatalog]);

  const toggleSelectedSkill = useCallback((skillId: string) => {
    setSelectedSkillIds((prev) => (prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]));
  }, []);

  const handleBulkAddSkills = useCallback(async () => {
    if (selectedSkillIds.length === 0) return;
    setBulkAdding(true);
    let added = 0;
    let failed = 0;
    const duplicateNames: string[] = [];
    const failedNames: string[] = [];
    const targetExistingIds = new Set((manualType === 'offered' ? (user?.skillsOffered ?? []) : (user?.skillsWanted ?? [])).map((s) => s.id));
    const catalogNameById = new Map(skillCatalog.map((s) => [s.id, s.name]));

    for (const skillId of selectedSkillIds) {
      const skillName = catalogNameById.get(skillId) ?? 'Unknown skill';
      if (targetExistingIds.has(skillId)) {
        duplicateNames.push(skillName);
        continue;
      }

      try {
        await UserService.addSkill(skillId, manualType, manualLevel);
        added += 1;
        targetExistingIds.add(skillId);
      } catch {
        failed += 1;
        failedNames.push(skillName);
      }
    }

    await refreshUser();
    setSelectedSkillIds([]);
    setBulkAdding(false);

    if (added > 0) {
      toast({
        title: `${added} skill${added > 1 ? 's' : ''} added`,
        description:
          duplicateNames.length > 0
            ? `Skipped duplicates: ${duplicateNames.join(', ')}.`
            : failed > 0
              ? `${failed} failed. You can retry them.`
              : 'Your profile is updated.',
        variant: 'success',
      });
      if (failedNames.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Some skills were not added',
          description: `Failed: ${failedNames.join(', ')}.`,
        });
      }
    } else {
      if (duplicateNames.length > 0 && failed === 0) {
        toast({
          title: 'No new skills to add',
          description: `All selected skills are already in ${SKILL_TYPE_LABEL[manualType]}: ${duplicateNames.join(', ')}.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Could not add selected skills',
          description:
            failedNames.length > 0
              ? `Failed: ${failedNames.join(', ')}.`
              : 'Please try again in a moment.',
        });
      }
    }
  }, [manualLevel, manualType, refreshUser, selectedSkillIds, toast, user?.skillsOffered, user?.skillsWanted, skillCatalog]);

  const startEditingSkill = useCallback((skill: Skill, type: 'offered' | 'wanted') => {
    setEditingSkillKey(`${type}:${skill.id}`);
    setEditingSkillLevel(normalizeLevel(skill.level));
  }, []);

  const saveEditedSkill = useCallback(async (skill: Skill, type: 'offered' | 'wanted') => {
    const key = `${type}:${skill.id}`;
    setSavingEditSkillKey(key);

    try {
      await UserService.removeSkill(skill.id, type);
      const existsInCatalog = skillCatalog.some((catalogSkill) => catalogSkill.id === skill.id);

      if (existsInCatalog) {
        await UserService.addSkill(skill.id, type, editingSkillLevel);
      } else {
        await UserService.addCustomSkill(skill.name, skill.category, type, editingSkillLevel);
      }

      await refreshUser();
      setEditingSkillKey(null);
      toast({ title: `Updated ${skill.name}`, description: `Level set to ${LEVEL_DISPLAY[editingSkillLevel]}.`, variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not update skill',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingEditSkillKey(null);
    }
  }, [editingSkillLevel, refreshUser, skillCatalog, toast]);

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
  const offeredSkills = user?.skillsOffered ?? [];
  const wantedSkills = user?.skillsWanted ?? [];

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

            {/* ── MY SKILLS ── */}
            {active === 'skills' && (
              <div className="space-y-6">
                {/* AI Detection Panel */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-primary">
                      <Sparkles className="h-4 w-4" /> AI Skill Detection
                    </CardTitle>
                    <CardDescription>Describe what you can teach and what you want to learn. We'll suggest matching skills.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">What can you teach?</label>
                        <textarea
                          value={skillTeachText}
                          onChange={(e) => { setSkillTeachText(e.target.value); setInterpretation(null); }}
                          placeholder="e.g. I can teach React, TypeScript and frontend architecture"
                          className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">What do you want to learn?</label>
                        <textarea
                          value={skillLearnText}
                          onChange={(e) => { setSkillLearnText(e.target.value); setInterpretation(null); }}
                          placeholder="e.g. I want to learn digital marketing and SEO"
                          className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                        />
                      </div>
                    </div>
                    <Button
                      variant="gradient"
                      className="gap-2"
                      disabled={isInterpreting || (!skillTeachText.trim() && !skillLearnText.trim())}
                      onClick={handleInterpretSkills}
                    >
                      {isInterpreting ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Suggest Skills</>}
                    </Button>

                    {interpretation && (
                      <div className="grid gap-3 sm:grid-cols-2 pt-1">
                        {interpretation.teach?.primary && (
                          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-background/70 px-3 py-2.5">
                            <div>
                              <p className="text-xs text-muted-foreground">Teach suggestion</p>
                              <p className="font-semibold text-sm">{interpretation.teach.primary.skillName} <span className="text-xs text-muted-foreground">({interpretation.teach.primary.confidence}%)</span></p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                              disabled={addingSkill}
                              onClick={() => handleAddSkill(interpretation.teach!.primary!, 'offered')}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        )}
                        {interpretation.learn?.primary && (
                          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-background/70 px-3 py-2.5">
                            <div>
                              <p className="text-xs text-muted-foreground">Learn suggestion</p>
                              <p className="font-semibold text-sm">{interpretation.learn.primary.skillName} <span className="text-xs text-muted-foreground">({interpretation.learn.primary.confidence}%)</span></p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                              disabled={addingSkill}
                              onClick={() => handleAddSkill(interpretation.learn!.primary!, 'wanted')}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Manual Add Panel */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">Manual Add</CardTitle>
                    <CardDescription>Select multiple skills and add them in one click.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <Input
                          value={manualQuery}
                          onChange={(e) => setManualQuery(e.target.value)}
                          placeholder="Search by skill name or category..."
                        />
                      </div>
                      <div>
                        <Select value={manualType} onValueChange={(value: 'offered' | 'wanted') => { setManualType(value); setSelectedSkillIds([]); }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Skill type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="offered">I can teach this</SelectItem>
                            <SelectItem value="wanted">I want to learn this</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="w-full sm:max-w-[220px]">
                        <Select value={manualLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setManualLevel(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Skill level" />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVEL_OPTIONS.map((level) => (
                              <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="gradient"
                        className="gap-2"
                        disabled={bulkAdding || selectedSkillIds.length === 0}
                        onClick={handleBulkAddSkills}
                      >
                        {bulkAdding ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4" /> Add selected ({selectedSkillIds.length})</>}
                      </Button>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      {catalogLoading ? (
                        <p className="text-sm text-muted-foreground">Loading skill catalog...</p>
                      ) : filteredCatalog.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No matching skills found for this filter.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {filteredCatalog.map((skill) => {
                            const selected = selectedSkillIds.includes(skill.id);
                            return (
                              <button
                                key={skill.id}
                                type="button"
                                onClick={() => toggleSelectedSkill(skill.id)}
                                className={cn(
                                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                  selected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5'
                                )}
                              >
                                {skill.name} <span className="opacity-70">· {skill.category}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Skills I Teach */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4 text-primary" /> Skills I Teach
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">{offeredSkills.length} skill{offeredSkills.length !== 1 ? 's' : ''}</span>
                    </div>
                    <CardDescription>Manage your teaching skills and adjust levels anytime.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {offeredSkills.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No teaching skills yet. Use AI Detection or Manual Add above.</p>
                    ) : (
                      <div className="space-y-2">
                        {offeredSkills.map((skill) => {
                          const rowKey = `offered:${skill.id}`;
                          const isEditing = editingSkillKey === rowKey;
                          const isSavingEdit = savingEditSkillKey === rowKey;
                          return (
                            <div key={rowKey} className="rounded-xl border border-border/60 bg-background px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{skill.name}</span>
                                  <Badge variant="secondary" className="text-[10px]">{LEVEL_DISPLAY[normalizeLevel(skill.level)]}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEditingSkill(skill, 'offered')}>
                                    Edit Level
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    disabled={removingSkillId === skill.id}
                                    onClick={() => handleRemoveSkill(skill.id, 'offered')}
                                  >
                                    {removingSkillId === skill.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              </div>

                              {isEditing && (
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <div className="sm:w-[180px]">
                                    <Select value={editingSkillLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setEditingSkillLevel(value)}>
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {LEVEL_OPTIONS.map((level) => (
                                          <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" className="h-8" disabled={isSavingEdit} onClick={() => saveEditedSkill(skill, 'offered')}>
                                      {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8" disabled={isSavingEdit} onClick={() => setEditingSkillKey(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Skills I Want to Learn */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4 text-accent" /> Skills I Want to Learn
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">{wantedSkills.length} skill{wantedSkills.length !== 1 ? 's' : ''}</span>
                    </div>
                    <CardDescription>Track your learning goals and tune level preferences.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {wantedSkills.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No learning goals yet. Use AI Detection or Manual Add above.</p>
                    ) : (
                      <div className="space-y-2">
                        {wantedSkills.map((skill) => {
                          const rowKey = `wanted:${skill.id}`;
                          const isEditing = editingSkillKey === rowKey;
                          const isSavingEdit = savingEditSkillKey === rowKey;
                          return (
                            <div key={rowKey} className="rounded-xl border border-border/60 bg-background px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{skill.name}</span>
                                  <Badge variant="secondary" className="text-[10px]">{LEVEL_DISPLAY[normalizeLevel(skill.level)]}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEditingSkill(skill, 'wanted')}>
                                    Edit Level
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    disabled={removingSkillId === skill.id}
                                    onClick={() => handleRemoveSkill(skill.id, 'wanted')}
                                  >
                                    {removingSkillId === skill.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              </div>

                              {isEditing && (
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <div className="sm:w-[180px]">
                                    <Select value={editingSkillLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setEditingSkillLevel(value)}>
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {LEVEL_OPTIONS.map((level) => (
                                          <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" className="h-8" disabled={isSavingEdit} onClick={() => saveEditedSkill(skill, 'wanted')}>
                                      {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8" disabled={isSavingEdit} onClick={() => setEditingSkillKey(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
              variant="gradient"
              disabled={!avatarPreview || savingAvatar}
              onClick={async () => {
                if (!avatarPreview) return;
                setSavingAvatar(true);
                try {
                  const compressed = await compressImage(avatarPreview);
                  await api.patch('/users/me', { avatar: compressed });
                  setLocalAvatar(compressed);
                  await refreshUser();
                  setAvatarDialogOpen(false);
                  setAvatarPreview(null);
                  toast({ title: 'Profile photo saved!', description: 'Your new photo is now visible on your profile.', variant: 'success' });
                } catch (err) {
                  toast({
                    variant: 'destructive',
                    title: 'Could not save photo',
                    description: err instanceof Error ? err.message : 'Please try again.',
                  });
                } finally {
                  setSavingAvatar(false);
                }
              }}
            >
              {savingAvatar ? 'Saving...' : 'Save Photo'}
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
