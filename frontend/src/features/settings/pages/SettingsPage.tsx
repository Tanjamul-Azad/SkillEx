
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
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
  User, Lock, Bell, Shield, Trash2, Camera,
  CheckCircle2, Eye, EyeOff, Zap, Github, Linkedin, Facebook, Globe, FileUp, PencilLine,
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
  teachIntentText: z.string().max(500, 'Teach intent cannot exceed 500 characters.').optional(),
  learnIntentText: z.string().max(500, 'Learn intent cannot exceed 500 characters.').optional(),
  githubUrl: z.string().max(600, 'GitHub URL is too long.').optional(),
  linkedinUrl: z.string().max(600, 'LinkedIn URL is too long.').optional(),
  facebookUrl: z.string().max(600, 'Facebook URL is too long.').optional(),
  websiteUrl: z.string().max(600, 'Website URL is too long.').optional(),
  resumeUrl: z.string().max(600, 'Resume URL is too long.').optional(),
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileJustSaved, setProfileJustSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // Connect Email state
  const [connectEmail, setConnectEmail] = useState('');
  const [connectOtp, setConnectOtp] = useState('');
  const [connectStep, setConnectStep] = useState<'input' | 'otp'>('input');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Dialog state
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // My Skills state
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

  /** Crop to square center and compress to 256×256 JPEG at 75% quality (~10-20 KB) */
  const compressImage = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 256;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Calculate crop to center square
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        // Draw cropped square image centered
        ctx.drawImage(img, x, y, size, size, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    });

  const handleAddSkill = useCallback(async (suggestion: SkillIntentSuggestion, type: 'offered' | 'wanted') => {
    const currentSkills = type === 'offered' ? (user?.skillsOffered ?? []) : (user?.skillsWanted ?? []);
    const currentSkillIds = new Set(currentSkills.map((s) => s.id));
    const currentSkillNames = new Set(currentSkills.map((s) => s.name.toLowerCase()));

    const catalogSkillId = suggestion.skillId;

    if (catalogSkillId && currentSkillIds.has(catalogSkillId)) {
      toast({
        title: 'Already added',
        description: `"${suggestion.skillName}" is already in ${SKILL_TYPE_LABEL[type]}.`,
      });
      return;
    }

    if (!catalogSkillId && currentSkillNames.has(suggestion.skillName.toLowerCase())) {
      toast({
        title: 'Already added',
        description: `"${suggestion.skillName}" is already in ${SKILL_TYPE_LABEL[type]}.`,
      });
      return;
    }

    setAddingSkill(true);
    try {
      if (catalogSkillId) {
        await UserService.addSkill(catalogSkillId, type, 'MODERATE');
      } else {
        await UserService.addCustomSkill(suggestion.skillName, suggestion.category || 'Other', type, 'MODERATE', undefined, undefined, true);
      }
      await refreshUser();
      toast({
        title: `"${suggestion.skillName}" added!`,
        description: catalogSkillId ? 'Added from existing catalog.' : 'Added as a new AI-detected skill.',
        variant: 'success',
      });
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

  const handleRequestOtp = useCallback(async () => {
    if (!connectEmail || !connectEmail.includes('@')) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setIsRequestingOtp(true);
    try {
      await UserService.requestEmailConnectOtp(connectEmail);
      toast({ title: 'OTP Sent', description: 'Please check your email for the OTP.', variant: 'success' });
      setConnectStep('otp');
    } catch (err) {
      const message = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error
          ? err.message
          : undefined;
      toast({ title: 'Failed to send OTP', description: message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsRequestingOtp(false);
    }
  }, [connectEmail, toast]);

  const handleVerifyOtp = useCallback(async () => {
    if (!connectOtp || connectOtp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter the 6-digit OTP.', variant: 'destructive' });
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await UserService.verifyEmailConnectOtp(connectEmail, connectOtp);
      toast({ title: 'Email Connected', description: 'Your email has been successfully updated.', variant: 'success' });
      await refreshUser();
      setConnectStep('input');
      setConnectEmail('');
      setConnectOtp('');
    } catch (err) {
      const message = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error
          ? err.message
          : undefined;
      toast({ title: 'Verification Failed', description: message || 'Please check your OTP and try again.', variant: 'destructive' });
    } finally {
      setIsVerifyingOtp(false);
    }
  }, [connectEmail, connectOtp, refreshUser, toast]);

  /* Profile form */
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      university: user?.university ?? '',
      bio: user?.bio ?? '',
      teachIntentText: user?.teachIntentText ?? '',
      learnIntentText: user?.learnIntentText ?? '',
      githubUrl: user?.githubUrl ?? '',
      linkedinUrl: user?.linkedinUrl ?? '',
      facebookUrl: user?.facebookUrl ?? '',
      websiteUrl: user?.websiteUrl ?? '',
      resumeUrl: user?.resumeUrl ?? '',
    },
  });

  useEffect(() => {
    profileForm.reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      university: user?.university ?? '',
      bio: user?.bio ?? '',
      teachIntentText: user?.teachIntentText ?? '',
      learnIntentText: user?.learnIntentText ?? '',
      githubUrl: user?.githubUrl ?? '',
      linkedinUrl: user?.linkedinUrl ?? '',
      facebookUrl: user?.facebookUrl ?? '',
      websiteUrl: user?.websiteUrl ?? '',
      resumeUrl: user?.resumeUrl ?? '',
    });
  }, [profileForm, user]);

  const handleEditProfile = useCallback(() => {
    setProfileEditMode(true);
    setProfileJustSaved(false);
  }, []);

  const handleCancelProfileEdit = useCallback(() => {
    profileForm.reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      university: user?.university ?? '',
      bio: user?.bio ?? '',
      teachIntentText: user?.teachIntentText ?? '',
      learnIntentText: user?.learnIntentText ?? '',
      githubUrl: user?.githubUrl ?? '',
      linkedinUrl: user?.linkedinUrl ?? '',
      facebookUrl: user?.facebookUrl ?? '',
      websiteUrl: user?.websiteUrl ?? '',
      resumeUrl: user?.resumeUrl ?? '',
    });
    setProfileEditMode(false);
    setProfileJustSaved(false);
  }, [profileForm, user]);

  const handleInterpretSkills = useCallback(async () => {
    const teachIntentValue = profileForm.getValues('teachIntentText') ?? '';
    const learnIntentValue = profileForm.getValues('learnIntentText') ?? '';
    if (!teachIntentValue.trim() && !learnIntentValue.trim()) return;

    setIsInterpreting(true);
    try {
      const result = await SkillService.interpretIntent({
        teachText: teachIntentValue || undefined,
        learnText: learnIntentValue || undefined,
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
  }, [profileForm, toast]);

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
        email: data.email,
        university: data.university,
        bio: data.bio ?? '',
        teachIntentText: data.teachIntentText ?? '',
        learnIntentText: data.learnIntentText ?? '',
        githubUrl: data.githubUrl ?? '',
        linkedinUrl: data.linkedinUrl ?? '',
        facebookUrl: data.facebookUrl ?? '',
        websiteUrl: data.websiteUrl ?? '',
        resumeUrl: data.resumeUrl ?? '',
      });
      // Refresh in-memory user so the sidebar/header reflect the new name/bio
      await refreshUser();
      profileForm.reset(data);
      setProfileEditMode(false);
      setProfileJustSaved(true);
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

  const handleResumePick = useCallback(async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'PDF only',
        description: 'Resume must be a PDF file.',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Resume size must be 10MB or less.',
      });
      return;
    }

    setUploadingResume(true);
    try {
      const uploaded = await UserService.uploadResume(file);
      const apiBase = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
        : window.location.origin;
      const nextUrl = uploaded.url.startsWith('http') ? uploaded.url : `${apiBase}${uploaded.url}`;
      profileForm.setValue('resumeUrl', nextUrl, { shouldDirty: true, shouldValidate: true });
      toast({
        title: 'Resume uploaded',
        description: 'Click Save Changes to publish it on your profile.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload resume.',
      });
    } finally {
      setUploadingResume(false);
    }
  }, [profileForm, toast]);

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
  const teachIntentText = profileForm.watch('teachIntentText') ?? '';
  const learnIntentText = profileForm.watch('learnIntentText') ?? '';
  const teachIntentCount = profileForm.watch('teachIntentText')?.length ?? 0;
  const learnIntentCount = profileForm.watch('learnIntentText')?.length ?? 0;
  const profileValues = profileForm.watch();
  const hasProfileChanges = profileForm.formState.isDirty;
  const offeredSkills = user?.skillsOffered ?? [];
  const wantedSkills = user?.skillsWanted ?? [];
  const teachPrimary = interpretation?.teach?.primary ?? null;
  const learnPrimary = interpretation?.learn?.primary ?? null;
  const teachAlternatives = (interpretation?.teach?.alternatives ?? [])
    .filter((suggestion) => {
      if (!teachPrimary) return true;
      if (teachPrimary.skillId && suggestion.skillId) return teachPrimary.skillId !== suggestion.skillId;
      return teachPrimary.skillName.toLowerCase() !== suggestion.skillName.toLowerCase();
    })
    .slice(0, 4);
  const learnAlternatives = (interpretation?.learn?.alternatives ?? [])
    .filter((suggestion) => {
      if (!learnPrimary) return true;
      if (learnPrimary.skillId && suggestion.skillId) return learnPrimary.skillId !== suggestion.skillId;
      return learnPrimary.skillName.toLowerCase() !== suggestion.skillName.toLowerCase();
    })
    .slice(0, 4);

  return (
    <DashboardLayout>
      <div className="product-page space-y-5">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="product-header">
          <div>
            <h1 className="product-title">Settings</h1>
            <p className="product-subtitle">Manage your account preferences, public profile, skills, security, and privacy from one place.</p>
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
            <nav className="product-panel flex h-full flex-row gap-1 overflow-x-auto p-2 custom-scrollbar lg:flex-col">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex w-full items-center justify-start gap-3 rounded-xl border px-3 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-wider transition-colors whitespace-nowrap lg:whitespace-normal group",
                    active === s.id
                      ? 'border-primary/35 bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/30 hover:text-foreground dark:hover:border-white/10'
                    , s.id === 'danger' && 'lg:mt-auto text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30')}
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
            className="flex-1 min-w-0 space-y-6"
          >
            {/* ── PROFILE ── */}
            {active === 'profile' && (
              <>
                <div className="product-panel">
                  <div className="flex flex-col gap-4 border-b border-border/60 bg-muted/15 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold font-headline text-foreground flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" /> Profile Information
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">
                        {profileEditMode ? 'Edit your public profile details.' : 'Your public profile details are saved.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest',
                          profileEditMode
                            ? hasProfileChanges
                              ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                              : 'border-white/10 bg-white/5 text-muted-foreground'
                            : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                        )}
                        role="status"
                        aria-live="polite"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {profileEditMode ? (hasProfileChanges ? 'Unsaved changes' : 'Editing') : (profileJustSaved ? 'Saved now' : 'Saved')}
                      </span>
                      {!profileEditMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEditProfile}
                          className="rounded-xl border-white/10 bg-white/5 text-[10px] font-extrabold uppercase tracking-widest hover:bg-white/10"
                        >
                          <PencilLine className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    {/* Avatar */}
                    <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="relative group">
                        <Avatar className="h-24 w-24 ring-4 ring-primary/20 bg-black/50 transition-all duration-500 group-hover:ring-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.15)] group-hover:shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
                          <AvatarImage src={localAvatar ?? user?.avatar} alt={user?.name} className="object-cover" />
                          <AvatarFallback className="text-2xl font-extrabold bg-gradient-to-br from-primary/20 to-secondary/20 text-primary">{user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={() => setAvatarDialogOpen(true)}
                          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)] hover:bg-primary/90 transition-transform duration-300 hover:scale-110 border-2 border-background"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-xl font-extrabold font-headline text-foreground">{user?.name}</p>
                        <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">{user?.email}</p>
                        <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/20 px-3 py-1 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] text-[9px] uppercase tracking-[0.2em] font-extrabold">{user?.level}</Badge>
                      </div>
                    </div>

                    {profileEditMode ? (
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <FormField control={profileForm.control} name="name" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Full Name</FormLabel>
                              <FormControl><Input {...field} placeholder="Your name" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={profileForm.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email</FormLabel>
                              <FormControl><Input {...field} type="email" placeholder="your@email.com" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={profileForm.control} name="university" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">University / Institution</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. BUET, Dhaka University" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={profileForm.control} name="bio" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bio</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Tell others a bit about yourself..."
                                className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 resize-none h-24 rounded-xl custom-scrollbar"
                              />
                            </FormControl>
                            <div className="flex items-center justify-between mt-2">
                              <FormMessage />
                              <span className={`text-[10px] font-bold tracking-widest ${charCount > 280 ? 'text-destructive' : 'text-white/40'}`}>
                                {charCount}/300
                              </span>
                            </div>
                          </FormItem>
                        )} />
                        <div className="grid gap-6 sm:grid-cols-2">
                          <FormField control={profileForm.control} name="teachIntentText" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">What You Want To Teach (Intent)</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="e.g. I can teach crafting with household waste materials"
                                  className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 resize-none h-24 rounded-xl custom-scrollbar"
                                />
                              </FormControl>
                              <div className="flex items-center justify-between mt-2">
                                <FormDescription className="text-[10px] uppercase font-bold tracking-widest text-white/40 leading-relaxed max-w-[200px]">Used for intent-based smart matching.</FormDescription>
                                <span className={`text-[10px] font-bold tracking-widest ${teachIntentCount > 470 ? 'text-destructive' : 'text-white/40'}`}>
                                  {teachIntentCount}/500
                                </span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={profileForm.control} name="learnIntentText" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">What You Want To Learn (Intent)</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="e.g. I want to learn DIY upcycling craft"
                                  className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 resize-none h-24 rounded-xl custom-scrollbar"
                                />
                              </FormControl>
                              <div className="flex items-center justify-between mt-2">
                                <FormDescription className="text-[10px] uppercase font-bold tracking-widest text-white/40 leading-relaxed max-w-[200px]">Keep it practical and specific for better matches.</FormDescription>
                                <span className={`text-[10px] font-bold tracking-widest ${learnIntentCount > 470 ? 'text-destructive' : 'text-white/40'}`}>
                                  {learnIntentCount}/500
                                </span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-5">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold tracking-wide text-white">Public Links</h4>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">These links are shown on your profile.</p>
                          </div>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <FormField control={profileForm.control} name="githubUrl" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                  <Github className="h-3.5 w-3.5" /> GitHub
                                </FormLabel>
                                <FormControl><Input {...field} placeholder="github.com/username" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={profileForm.control} name="linkedinUrl" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                                </FormLabel>
                                <FormControl><Input {...field} placeholder="linkedin.com/in/username" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={profileForm.control} name="facebookUrl" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                  <Facebook className="h-3.5 w-3.5" /> Facebook
                                </FormLabel>
                                <FormControl><Input {...field} placeholder="facebook.com/username" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={profileForm.control} name="websiteUrl" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                  <Globe className="h-3.5 w-3.5" /> Website
                                </FormLabel>
                                <FormControl><Input {...field} placeholder="your-portfolio.com" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <div className="space-y-3">
                            <FormField control={profileForm.control} name="resumeUrl" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Resume URL</FormLabel>
                                <FormControl><Input {...field} placeholder="Auto-filled after PDF upload" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <div className="flex flex-wrap items-center gap-3">
                              <input
                                ref={resumeInputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  void handleResumePick(file);
                                  e.currentTarget.value = '';
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                                disabled={uploadingResume}
                                onClick={() => resumeInputRef.current?.click()}
                              >
                                <FileUp className="mr-2 h-4 w-4" />
                                {uploadingResume ? 'Uploading...' : 'Upload Resume PDF'}
                              </Button>
                              {profileForm.watch('resumeUrl')?.trim() && (
                                <Button type="button" variant="ghost" className="rounded-xl text-primary hover:text-primary" asChild>
                                  <a href={profileForm.watch('resumeUrl')?.trim()} target="_blank" rel="noreferrer">Open Resume</a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              type="submit"
                              disabled={savingProfile}
                              className="min-w-[140px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all"
                            >
                              {savingProfile ? 'Saving...' : <><CheckCircle2 className="mr-2 h-4 w-4" />Save Changes</>}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={savingProfile}
                              onClick={handleCancelProfileEdit}
                              className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <div className="space-y-6">
                        {profileJustSaved && (
                          <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-emerald-100">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                              <p className="text-sm font-extrabold">Profile saved</p>
                              <p className="mt-1 text-xs text-emerald-100/80">Your text fields are hidden now. Use Edit when you need to change them again.</p>
                            </div>
                          </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                          {[
                            { label: 'Full Name', value: profileValues.name },
                            { label: 'Email', value: profileValues.email },
                            { label: 'University / Institution', value: profileValues.university },
                            { label: 'Bio', value: profileValues.bio },
                            { label: 'Teach Intent', value: profileValues.teachIntentText },
                            { label: 'Learn Intent', value: profileValues.learnIntentText },
                          ].map(({ label, value }) => (
                            <div key={label} className={cn('rounded-2xl border border-white/10 bg-black/20 p-4', label === 'Bio' && 'sm:col-span-2')}>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold text-white">
                                {value?.trim() || 'Not added'}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold tracking-wide text-white">Public Links</h4>
                              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">These links are shown on your profile.</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleEditProfile}
                              className="rounded-xl text-primary hover:text-primary"
                            >
                              <PencilLine className="mr-2 h-4 w-4" />
                              Edit links
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              { label: 'GitHub', value: profileValues.githubUrl, Icon: Github },
                              { label: 'LinkedIn', value: profileValues.linkedinUrl, Icon: Linkedin },
                              { label: 'Facebook', value: profileValues.facebookUrl, Icon: Facebook },
                              { label: 'Website', value: profileValues.websiteUrl, Icon: Globe },
                              { label: 'Resume URL', value: profileValues.resumeUrl, Icon: FileUp },
                            ].map(({ label, value, Icon }) => (
                              <div key={label} className={cn('rounded-xl border border-white/10 bg-black/20 p-3', label === 'Resume URL' && 'sm:col-span-2')}>
                                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  <Icon className="h-3.5 w-3.5" />
                                  {label}
                                </p>
                                {value?.trim() ? (
                                  <a
                                    href={value.trim()}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 block break-words text-sm font-semibold text-primary hover:underline"
                                  >
                                    {value.trim()}
                                  </a>
                                ) : (
                                  <p className="mt-2 text-sm font-semibold text-white/50">Not added</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="product-panel">
                  <div className="p-5 border-b border-border/60 bg-muted/15 dark:border-white/10">
                    <h3 className="text-lg font-extrabold font-headline text-foreground flex items-center gap-2">
                      <Zap className="h-5 w-5 text-accent" /> SkillEx Stats
                    </h3>
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        { label: 'SkillEx Score', value: user?.skillexScore },
                        { label: 'Sessions', value: user?.sessionsCompleted },
                        { label: 'Rating', value: `${user?.rating} ★` },
                        { label: 'Skills Offered', value: user?.skillsOffered?.length ?? 0 },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-2xl bg-black/50 border border-white/5 p-4 text-center group hover:bg-white/5 transition-colors">
                          <p className="font-headline text-3xl font-black text-white group-hover:text-primary transition-colors">{value}</p>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── MY SKILLS ── */}
            {active === 'skills' && (
              <div className="space-y-6">
                {/* AI Detection Panel */}
                <div className="overflow-hidden rounded-[2rem] border border-primary/20 bg-primary/5 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                  <div className="p-6 border-b border-primary/10 relative z-10">
                    <h3 className="text-xl font-extrabold font-headline text-primary flex items-center gap-2 drop-shadow-[0_0_8px_var(--primary)]">
                      <Sparkles className="h-5 w-5" /> AI Skill Detection
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-primary/70 mt-1">Describe what you can teach and what you want to learn. We'll suggest matching skills.</p>
                  </div>
                  <div className="p-6 space-y-4 relative z-10">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-primary/70">What can you teach?</label>
                        <textarea
                          value={teachIntentText}
                          onChange={(e) => {
                            profileForm.setValue('teachIntentText', e.target.value, { shouldDirty: true, shouldTouch: true });
                            setInterpretation(null);
                          }}
                          placeholder="e.g. I can teach React, TypeScript and frontend architecture"
                          className="w-full resize-none rounded-xl border border-primary/20 bg-black/40 px-4 py-3 text-sm placeholder:text-white/30 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] custom-scrollbar appearance-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-primary/70">What do you want to learn?</label>
                        <textarea
                          value={learnIntentText}
                          onChange={(e) => {
                            profileForm.setValue('learnIntentText', e.target.value, { shouldDirty: true, shouldTouch: true });
                            setInterpretation(null);
                          }}
                          placeholder="e.g. I want to learn digital marketing and SEO"
                          className="w-full resize-none rounded-xl border border-primary/20 bg-black/40 px-4 py-3 text-sm placeholder:text-white/30 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] custom-scrollbar appearance-none"
                        />
                      </div>
                    </div>
                    <Button
                      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all min-w-[160px]"
                      disabled={isInterpreting || (!teachIntentText.trim() && !learnIntentText.trim())}
                      onClick={handleInterpretSkills}
                    >
                      {isInterpreting ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Suggest Skills</>}
                    </Button>

                    {interpretation && (
                      <div className="grid gap-4 sm:grid-cols-2 pt-2">
                        {teachPrimary && (
                          <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 backdrop-blur-md shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.1)]">
                            <div>
                              <p className="text-[10px] uppercase font-bold tracking-widest text-primary/70">Teach suggestion</p>
                              <p className="font-bold text-white mt-0.5 flex items-center gap-2">
                                {teachPrimary.skillName}
                                <span className="text-[10px] font-bold tracking-widest text-primary">({teachPrimary.confidence}%)</span>
                                {teachPrimary.custom && (
                                  <span className="rounded-full border border-primary bg-primary/20 px-2 py-0.5 text-[9px] uppercase tracking-widest font-black text-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]">AI New</span>
                                )}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary shadow-[0_0_10px_hsl(var(--primary)/0.1)]"
                              disabled={addingSkill}
                              onClick={() => {
                                const suggestion = teachPrimary;
                                if (suggestion) handleAddSkill(suggestion, 'offered');
                              }}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        )}
                        {learnPrimary && (
                          <div className="flex items-center justify-between rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 backdrop-blur-md shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.1)]">
                            <div>
                              <p className="text-[10px] uppercase font-bold tracking-widest text-secondary/70">Learn suggestion</p>
                              <p className="font-bold text-white mt-0.5 flex items-center gap-2">
                                {learnPrimary.skillName}
                                <span className="text-[10px] font-bold tracking-widest text-secondary">({learnPrimary.confidence}%)</span>
                                {learnPrimary.custom && (
                                  <span className="rounded-full border border-secondary bg-secondary/20 px-2 py-0.5 text-[9px] uppercase tracking-widest font-black text-secondary shadow-[0_0_10px_hsl(var(--secondary)/0.3)]">AI New</span>
                                )}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs font-bold gap-1 border-secondary/30 text-secondary hover:bg-secondary/20 hover:text-secondary shadow-[0_0_10px_hsl(var(--secondary)/0.1)]"
                              disabled={addingSkill}
                              onClick={() => {
                                const suggestion = learnPrimary;
                                if (suggestion) handleAddSkill(suggestion, 'wanted');
                              }}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {interpretation && (teachAlternatives.length > 0 || learnAlternatives.length > 0) && (
                      <div className="grid gap-4 sm:grid-cols-2 pt-1">
                        <div className="rounded-2xl border border-primary/20 bg-black/30 p-3">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-primary/70 mb-2">More teach suggestions</p>
                          {teachAlternatives.length === 0 ? (
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No additional teach suggestions.</p>
                          ) : (
                            <div className="space-y-2">
                              {teachAlternatives.map((suggestion, idx) => (
                                <div key={`teach-alt-${suggestion.skillId ?? suggestion.skillName}-${idx}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-white">{suggestion.skillName}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-primary/70">{suggestion.confidence}%</p>
                                  </div>
                                  <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold border-primary/30 text-primary hover:bg-primary/20" disabled={addingSkill} onClick={() => handleAddSkill(suggestion, 'offered')}>
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-secondary/20 bg-black/30 p-3">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-secondary/70 mb-2">More learn suggestions</p>
                          {learnAlternatives.length === 0 ? (
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No additional learn suggestions.</p>
                          ) : (
                            <div className="space-y-2">
                              {learnAlternatives.map((suggestion, idx) => (
                                <div key={`learn-alt-${suggestion.skillId ?? suggestion.skillName}-${idx}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-white">{suggestion.skillName}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-secondary/70">{suggestion.confidence}%</p>
                                  </div>
                                  <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold border-secondary/30 text-secondary hover:bg-secondary/20" disabled={addingSkill} onClick={() => handleAddSkill(suggestion, 'wanted')}>
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Add Panel */}
                <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                  <div className="p-6 border-b border-white/5 bg-white/5">
                    <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
                      <Plus className="h-5 w-5 text-accent" /> Manual Add
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Select multiple skills and add them in one click.</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <Input
                          value={manualQuery}
                          onChange={(e) => setManualQuery(e.target.value)}
                          placeholder="Search by skill name or category..."
                          className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl"
                        />
                      </div>
                      <div>
                        <Select value={manualType} onValueChange={(value: 'offered' | 'wanted') => { setManualType(value); setSelectedSkillIds([]); }}>
                          <SelectTrigger className="appearance-none bg-black/20 border-white/10 text-white focus:ring-primary/50 focus:border-primary/50 rounded-xl font-bold">
                            <SelectValue placeholder="Skill type" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl rounded-xl">
                            <SelectItem value="offered">I can teach this</SelectItem>
                            <SelectItem value="wanted">I want to learn this</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="w-full sm:max-w-[220px]">
                        <Select value={manualLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setManualLevel(value)}>
                          <SelectTrigger className="appearance-none bg-black/20 border-white/10 text-white focus:ring-primary/50 focus:border-primary/50 rounded-xl font-bold">
                            <SelectValue placeholder="Skill level" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl rounded-xl">
                            {LEVEL_OPTIONS.map((level) => (
                              <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all"
                        disabled={bulkAdding || selectedSkillIds.length === 0}
                        onClick={handleBulkAddSkills}
                      >
                        {bulkAdding ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4" /> Add selected ({selectedSkillIds.length})</>}
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-black/50 p-4 min-h-[100px] shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                      {catalogLoading ? (
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Loading skill catalog...</p>
                      ) : filteredCatalog.length === 0 ? (
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">No matching skills found for this filter.</p>
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
                                  'rounded-xl border px-3 py-1.5 text-[11px] uppercase tracking-widest font-black transition-all shadow-sm',
                                  selected
                                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)] scale-[1.02]'
                                    : 'border-white/5 bg-black/40 text-muted-foreground hover:border-white/20 hover:text-white hover:bg-white/5'
                                )}
                              >
                                {skill.name} <span className={cn("opacity-50 font-medium ml-1", selected ? "text-primary-foreground" : "text-white/40")}>· {skill.category}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills I Teach */}
                <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                  <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" /> Skills I Teach
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Manage your teaching skills and adjust levels anytime.</p>
                    </div>
                    <span className="bg-primary/20 text-primary border border-primary/20 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] whitespace-nowrap">{offeredSkills.length} skill{offeredSkills.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-6">
                    {offeredSkills.length === 0 ? (
                      <p className="text-[10px] py-4 uppercase font-bold tracking-widest text-muted-foreground text-center border-2 border-dashed border-white/5 rounded-2xl">No teaching skills yet. Use AI Detection or Manual Add above.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {offeredSkills.map((skill) => {
                          const rowKey = `offered:${skill.id}`;
                          const isEditing = editingSkillKey === rowKey;
                          const isSavingEdit = savingEditSkillKey === rowKey;
                          return (
                            <div key={rowKey} className="rounded-2xl border border-white/5 bg-black/50 p-4 transition-all hover:bg-white/5 group shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <span className="font-bold text-white text-base block">{skill.name}</span>
                                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black mt-1.5 border-white/10 bg-white/5 text-muted-foreground">{LEVEL_DISPLAY[normalizeLevel(skill.level)]}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-white/10 text-muted-foreground hover:text-white px-3 rounded-xl transition-colors" onClick={() => startEditingSkill(skill, 'offered')}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    disabled={removingSkillId === skill.id}
                                    onClick={() => handleRemoveSkill(skill.id, 'offered')}
                                  >
                                    {removingSkillId === skill.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <X className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>

                              {isEditing && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                                  <Select value={editingSkillLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setEditingSkillLevel(value)}>
                                    <SelectTrigger className="h-10 appearance-none bg-black/40 border-white/10 text-white rounded-xl focus:ring-primary/50 focus:border-primary/50 font-bold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl rounded-xl">
                                      {LEVEL_OPTIONS.map((level) => (
                                        <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 rounded-lg" disabled={isSavingEdit} onClick={() => setEditingSkillKey(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-[0_0_10px_hsl(var(--primary)/0.2)]" disabled={isSavingEdit} onClick={() => saveEditedSkill(skill, 'offered')}>
                                      {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Level'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills I Want to Learn */}
                <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                  <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-accent" /> Skills I Want to Learn
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Track your learning goals and tune level preferences.</p>
                    </div>
                    <span className="bg-secondary/20 text-secondary border border-secondary/20 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] whitespace-nowrap">{wantedSkills.length} skill{wantedSkills.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-6">
                    {wantedSkills.length === 0 ? (
                      <p className="text-[10px] py-4 uppercase font-bold tracking-widest text-muted-foreground text-center border-2 border-dashed border-white/5 rounded-2xl">No learning goals yet. Use AI Detection or Manual Add above.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {wantedSkills.map((skill) => {
                          const rowKey = `wanted:${skill.id}`;
                          const isEditing = editingSkillKey === rowKey;
                          const isSavingEdit = savingEditSkillKey === rowKey;
                          return (
                            <div key={rowKey} className="rounded-2xl border border-white/5 bg-black/50 p-4 transition-all hover:bg-white/5 group shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <span className="font-bold text-white text-base block">{skill.name}</span>
                                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black mt-1.5 border-white/10 bg-white/5 text-muted-foreground">{LEVEL_DISPLAY[normalizeLevel(skill.level)]}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-white/10 text-muted-foreground hover:text-white px-3 rounded-xl transition-colors" onClick={() => startEditingSkill(skill, 'wanted')}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    disabled={removingSkillId === skill.id}
                                    onClick={() => handleRemoveSkill(skill.id, 'wanted')}
                                  >
                                    {removingSkillId === skill.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <X className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>

                              {isEditing && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                                  <Select value={editingSkillLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setEditingSkillLevel(value)}>
                                    <SelectTrigger className="h-10 appearance-none bg-black/40 border-white/10 text-white rounded-xl focus:ring-primary/50 focus:border-primary/50 font-bold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl rounded-xl">
                                      {LEVEL_OPTIONS.map((level) => (
                                        <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 rounded-lg" disabled={isSavingEdit} onClick={() => setEditingSkillKey(null)}>
                                      Cancel
                                    </Button>
                                    <Button size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-[0_0_10px_hsl(var(--primary)/0.2)]" disabled={isSavingEdit} onClick={() => saveEditedSkill(skill, 'wanted')}>
                                      {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Level'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {active === 'security' && (
              <div className="space-y-6">
                {/* CONNECT EMAIL BLOCK */}
                <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                  <div className="p-6 border-b border-white/5 bg-white/5">
                    <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
                      <Lock className="h-5 w-5 text-accent" /> Connect Google Account
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Verify a Gmail address to log in with Google next time.</p>
                  </div>
                  <div className="p-6">
                    {connectStep === 'input' ? (
                      <div className="space-y-4 max-w-md">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">New Email Address</Label>
                          <Input
                            type="email"
                            placeholder="your.google.account@gmail.com"
                            value={connectEmail}
                            onChange={(e) => setConnectEmail(e.target.value)}
                            className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-accent/50 focus:border-accent/50 rounded-xl"
                          />
                        </div>
                        <Button 
                          onClick={handleRequestOtp} 
                          disabled={isRequestingOtp || !connectEmail}
                          className="min-w-[160px] bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_30px_hsl(var(--accent)/0.4)] transition-all"
                        >
                          {isRequestingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send OTP'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-md">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Enter 6-digit OTP</Label>
                          <Input
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={connectOtp}
                            onChange={(e) => setConnectOtp(e.target.value)}
                            className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-accent/50 focus:border-accent/50 rounded-xl tracking-widest font-mono text-lg"
                          />
                          <p className="text-xs text-muted-foreground">OTP sent to: <strong>{connectEmail}</strong></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={handleVerifyOtp} 
                            disabled={isVerifyingOtp || connectOtp.length !== 6}
                            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_30px_hsl(var(--accent)/0.4)] transition-all"
                          >
                            {isVerifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Verify & Connect'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setConnectStep('input')}
                            className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                  <div className="p-6 border-b border-white/5 bg-white/5">
                    <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" /> Change Password
                    </h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Use a strong password that you don't use elsewhere.</p>
                  </div>
                <div className="p-6">
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordSave)} className="space-y-6 max-w-md">
                      <FormField control={passwordForm.control} name="current" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Current Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input {...field} type={showCurrent ? 'text' : 'password'} placeholder="Your current password" className="pr-10 appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" />
                            </FormControl>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => setShowCurrent((v) => !v)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg"
                            >
                              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={passwordForm.control} name="next" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">New Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input {...field} type={showNext ? 'text' : 'password'} placeholder="Min. 8 characters" className="pr-10 appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" />
                            </FormControl>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => setShowNext((v) => !v)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg"
                            >
                              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={passwordForm.control} name="confirm" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Confirm New Password</FormLabel>
                          <FormControl><Input {...field} type="password" placeholder="Repeat new password" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" disabled={savingPassword} className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all">
                        {savingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
              </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {active === 'notifications' && (
              <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                <div className="p-6 border-b border-white/5 bg-white/5">
                  <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" /> Notification Preferences
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Choose what you want to be notified about.</p>
                </div>
                <div className="p-6 space-y-6">
                  {([
                    { key: 'matchRequests', label: 'Match Requests', desc: 'When someone wants to exchange skills with you.' },
                    { key: 'sessionReminders', label: 'Session Reminders', desc: '30-minute reminders before scheduled sessions.' },
                    { key: 'reviews', label: 'Reviews & Ratings', desc: 'When someone leaves you a review.' },
                    { key: 'newsletter', label: 'Product Updates', desc: 'New features and platform announcements.' },
                    { key: 'marketing', label: 'Marketing Emails', desc: 'Tips, community highlights, and special offers.' },
                  ] as { key: keyof typeof notifications; label: string; desc: string }[]).map(({ key, label, desc }) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
                      <div>
                        <Label className="font-bold text-white text-sm">{label}</Label>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">{desc}</p>
                      </div>
                      <Switch
                        checked={notifications[key]}
                        onCheckedChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-white/10"
                      />
                    </div>
                  ))}
                  <Separator className="bg-white/10" />
                  <Button
                    className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all"
                    onClick={() => toast({ title: 'Preferences saved', variant: 'success' })}
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}

            {/* ── PRIVACY ── */}
            {active === 'privacy' && (
              <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                <div className="p-6 border-b border-white/5 bg-white/5">
                  <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Privacy Settings
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Control who can see and contact you.</p>
                </div>
                <div className="p-6 space-y-6">
                  {([
                    { key: 'publicProfile', label: 'Public Profile', desc: 'Your profile is visible to everyone on SkillEx.' },
                    { key: 'showOnline', label: 'Show Online Status', desc: 'Others can see when you are active.' },
                    { key: 'allowMatchRequests', label: 'Allow Match Requests', desc: 'Let other students send you exchange requests.' },
                  ] as { key: keyof typeof privacy; label: string; desc: string }[]).map(({ key, label, desc }) => (
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
                    onClick={() => toast({ title: 'Privacy settings saved', variant: 'success' })}
                  >
                    Save Privacy Settings
                  </Button>
                </div>
              </div>
            )}

            {/* ── DANGER ZONE ── */}
            {active === 'danger' && (
              <div className="overflow-hidden rounded-[2rem] border border-destructive/30 bg-destructive/5 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent pointer-events-none" />
                <div className="p-6 border-b border-destructive/20 bg-destructive/10 relative z-10">
                  <h3 className="text-xl font-extrabold font-headline text-destructive flex items-center gap-2 drop-shadow-[0_0_8px_var(--destructive)]">
                    <Trash2 className="h-5 w-5" /> Danger Zone
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-destructive/80 mt-1">These actions are irreversible. Proceed with caution.</p>
                </div>
                <div className="p-6 space-y-4 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 shadow-[inset_0_1px_0_0_hsla(24,100%,50%,0.1)]">
                    <div>
                      <p className="font-extrabold text-orange-500 font-headline text-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">Log out of all devices</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-orange-500/70 mt-1">Sign out everywhere and revoke all active sessions.</p>
                    </div>
                    <Button variant="outline" className="border-orange-500/30 text-orange-500 hover:bg-orange-500/20 hover:text-orange-400 font-bold rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.15)]" onClick={() => setConfirmLogoutAll(true)}>
                      Log Out Everywhere
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-destructive/40 bg-destructive/20 p-5 shadow-[inset_0_1px_0_0_hsla(0,100%,50%,0.2)]">
                    <div>
                      <p className="font-extrabold text-destructive font-headline text-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">Delete Account</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-destructive/80 mt-1">Permanently remove your account and all data.</p>
                    </div>
                    <Button
                      variant="destructive"
                      className="rounded-xl font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] bg-destructive text-destructive-foreground"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
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
                  // Crop to square center and compress
                  const compressed = await compressImage(avatarPreview);
                  const res = await fetch(compressed);
                  const blob = await res.blob();
                  const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

                  const upRes = await UserService.uploadFile(file);

                  // Build the avatar URL relative to the API base — no hardcoded host.
                  const apiBase = import.meta.env.VITE_API_URL
                    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
                    : window.location.origin;
                  const newAvatarUrl = upRes.url.startsWith('http') ? upRes.url : `${apiBase}${upRes.url}`;
                  await api.patch('/users/me', { avatar: newAvatarUrl });
                  setLocalAvatar(newAvatarUrl);
                  await refreshUser();
                  setAvatarDialogOpen(false);
                  setAvatarPreview(null);
                  toast({
                    title: 'Profile photo saved!',
                    description: 'Your new photo is now visible on your profile.',
                    variant: 'success',
                  });
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
