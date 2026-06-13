import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User as UserIcon, PencilLine, Camera, CheckCircle2,
  Github, Linkedin, Facebook, Globe, FileUp, Zap, BrainCircuit, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { UserService } from '@/services/userService';
import {
  resumeProfileService,
  type ResumeProfile,
  type ResumeSkillSuggestion,
} from '@/services/resumeProfileService';
import { api, ApiError } from '@/services/api';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email.'),
  university: z.string().min(2, 'University name is required.'),
  phone: z.string().max(50, 'Phone number is too long.').optional(),
  address: z.string().max(300, 'Address is too long.').optional(),
  bio: z.string().max(300, 'Bio cannot exceed 300 characters.').optional(),
  teachIntentText: z.string().max(500, 'Teach intent cannot exceed 500 characters.').optional(),
  learnIntentText: z.string().max(500, 'Learn intent cannot exceed 500 characters.').optional(),
  githubUrl: z.string().max(600, 'GitHub URL is too long.').optional(),
  linkedinUrl: z.string().max(600, 'LinkedIn URL is too long.').optional(),
  facebookUrl: z.string().max(600, 'Facebook URL is too long.').optional(),
  websiteUrl: z.string().max(600, 'Website URL is too long.').optional(),
  resumeUrl: z.string().max(600, 'Resume URL is too long.').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const skillSuggestionKey = (skill: ResumeSkillSuggestion) =>
  `${skill.name.trim().toLowerCase()}::${skill.category.trim().toLowerCase()}`;

const toResumeHref = (url?: string | null) => {
  const value = url?.trim();
  if (!value) return '';
  if (value.startsWith('http')) return value;
  if (!value.startsWith('/')) return value;
  const apiBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : window.location.origin;
  return `${apiBase}${value}`;
};

const resumeScanFailureMessage = (err: unknown) => {
  if (err instanceof ApiError) {
    const serverMessage =
      err.data != null && typeof err.data === 'object' && 'message' in err.data
        ? String((err.data as Record<string, unknown>).message ?? '')
        : err.message;
    if (
      err.status === 404 ||
      serverMessage.toLowerCase().includes('route not found') ||
      serverMessage.toLowerCase().includes('unexpected error')
    ) {
      return 'Resume scanner endpoint is not available on the running backend. Restart the backend, then scan again.';
    }
    return serverMessage || err.message;
  }
  return err instanceof Error ? err.message : 'Could not analyze resume.';
};

interface ProfileTabProps {
  user: User | null;
  refreshUser: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (options: any) => void;
}

export default function ProfileTab({ user, refreshUser, toast }: ProfileTabProps) {
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileJustSaved, setProfileJustSaved] = useState(false);

  // Avatar / Resume uploads
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [resumeReviewOpen, setResumeReviewOpen] = useState(false);
  const [applyingResumeProfile, setApplyingResumeProfile] = useState(false);
  const [applyResumeBio, setApplyResumeBio] = useState(true);
  const [applyResumeTeachIntent, setApplyResumeTeachIntent] = useState(true);
  const [applyResumeContact, setApplyResumeContact] = useState(true);
  const [learnIntentDraft, setLearnIntentDraft] = useState('');
  const [selectedOfferedResumeSkills, setSelectedOfferedResumeSkills] = useState<Set<string>>(new Set());

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      university: user?.university ?? '',
      phone: user?.phone ?? '',
      address: user?.address ?? '',
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
      phone: user?.phone ?? '',
      address: user?.address ?? '',
      bio: user?.bio ?? '',
      teachIntentText: user?.teachIntentText ?? '',
      learnIntentText: user?.learnIntentText ?? '',
      githubUrl: user?.githubUrl ?? '',
      linkedinUrl: user?.linkedinUrl ?? '',
      facebookUrl: user?.facebookUrl ?? '',
      websiteUrl: user?.websiteUrl ?? '',
      resumeUrl: user?.resumeUrl ?? '',
    });
  }, [user, profileForm]);

  useEffect(() => {
    let active = true;
    void resumeProfileService.getLatest()
      .then((profile) => {
        if (active && profile) {
          setResumeProfile(profile);
        }
      })
      .catch(() => {
        // A missing resume scan should not block profile editing.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleEditProfile = () => {
    setProfileEditMode(true);
    setProfileJustSaved(false);
  };

  const handleCancelProfileEdit = () => {
    profileForm.reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      university: user?.university ?? '',
      phone: user?.phone ?? '',
      address: user?.address ?? '',
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
  };

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
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        ctx.drawImage(img, x, y, size, size, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = dataUrl;
    });

  const handleProfileSave = async (data: ProfileFormData) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await UserService.updateProfile(user.id, {
        name: data.name,
        email: data.email,
        university: data.university,
        phone: data.phone ?? '',
        address: data.address ?? '',
        bio: data.bio ?? '',
        teachIntentText: data.teachIntentText ?? '',
        learnIntentText: data.learnIntentText ?? '',
        githubUrl: data.githubUrl ?? '',
        linkedinUrl: data.linkedinUrl ?? '',
        facebookUrl: data.facebookUrl ?? '',
        websiteUrl: data.websiteUrl ?? '',
        resumeUrl: data.resumeUrl ?? '',
      });
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

  const primeResumeReview = (profile: ResumeProfile) => {
    setResumeProfile(profile);
    // Pre-select teachable skills (the resume is real evidence for these).
    setSelectedOfferedResumeSkills(new Set((profile.suggestedOfferedSkills ?? []).map(skillSuggestionKey)));
    setApplyResumeBio(true);
    setApplyResumeTeachIntent(true);
    setApplyResumeContact(!!(profile.phone || profile.address));
    setLearnIntentDraft(user?.learnIntentText ?? '');
    setResumeReviewOpen(true);
  };

  const toggleResumeSkill = (key: string) => {
    setSelectedOfferedResumeSkills((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleResumePick = async (file?: File) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Unsupported file', description: 'Upload a PDF, PNG, JPG, or WebP resume.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Resume size must be 10MB or less.' });
      return;
    }

    setUploadingResume(true);
    try {
      const analyzed = await resumeProfileService.analyze(file);
      const resumeUrl = analyzed.resumeUrl ?? '';
      const nextUrl = toResumeHref(resumeUrl);
      profileForm.setValue('resumeUrl', nextUrl, { shouldDirty: true, shouldValidate: true });
      primeResumeReview(analyzed);
      toast({
        title: 'Resume scanned',
        description: 'Review the extracted profile data before applying it.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Resume scan failed',
        description: resumeScanFailureMessage(err),
      });
    } finally {
      setUploadingResume(false);
    }
  };

  const applyResumeProfile = async () => {
    if (!resumeProfile) return;
    setApplyingResumeProfile(true);
    try {
      const offeredSkills = (resumeProfile.suggestedOfferedSkills ?? [])
        .filter((skill) => selectedOfferedResumeSkills.has(skillSuggestionKey(skill)))
        .map(({ name, category, level, evidence }) => ({ name, category, level, evidence }));

      await resumeProfileService.apply({
        applyBio: applyResumeBio,
        applyTeachIntent: applyResumeTeachIntent,
        applyContact: applyResumeContact,
        learnIntentText: learnIntentDraft.trim() || undefined,
        offeredSkills,
      });
      await refreshUser();
      setResumeReviewOpen(false);
      setProfileEditMode(false);
      setProfileJustSaved(true);
      toast({
        title: 'Profile filled from resume',
        description: 'Selected profile fields and skills are now saved.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not apply resume data',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setApplyingResumeProfile(false);
    }
  };

  const charCount = profileForm.watch('bio')?.length ?? 0;
  const teachIntentCount = profileForm.watch('teachIntentText')?.length ?? 0;
  const learnIntentCount = profileForm.watch('learnIntentText')?.length ?? 0;
  const profileValues = profileForm.watch();
  const hasProfileChanges = profileForm.formState.isDirty;
  const profileInputClass =
    'appearance-none rounded-xl border-border/70 bg-background text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/50';
  const profileTextareaClass = cn(profileInputClass, 'h-24 resize-none custom-scrollbar');
  const profileSurfaceClass = 'rounded-2xl border border-border/70 bg-card/80 shadow-sm';
  const profileFieldClass = 'rounded-2xl border border-border/70 bg-muted/20 p-4';
  const profileLinkFieldClass = 'rounded-xl border border-border/70 bg-muted/20 p-3';

  return (
    <>
      <div className="product-panel">
        <div className="flex flex-col gap-4 border-b border-border/60 bg-muted/15 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-extrabold font-headline text-foreground flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" /> Profile Information
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
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200'
                    : 'border-border bg-muted/30 text-muted-foreground'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
              )}
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
                className="rounded-xl text-[10px] font-extrabold uppercase tracking-widest"
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
              <Avatar className="h-24 w-24 ring-4 ring-primary/20 bg-muted transition-all duration-500 group-hover:ring-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.15)] group-hover:shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
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
                      <FormControl><Input {...field} placeholder="Your name" className={profileInputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Email</FormLabel>
                      <FormControl><Input {...field} type="email" placeholder="your@email.com" className={profileInputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={profileForm.control} name="university" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">University / Institution</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. BUET, Dhaka University" className={profileInputClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField control={profileForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Phone Number</FormLabel>
                      <FormControl><Input {...field} placeholder="+880 1700-000000" className={profileInputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Address</FormLabel>
                      <FormControl><Input {...field} placeholder="City, District, Country" className={profileInputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={profileForm.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tell others a bit about yourself..."
                        className={profileTextareaClass}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between mt-2">
                      <FormMessage />
                      <span className={`text-[10px] font-bold tracking-widest ${charCount > 280 ? 'text-destructive' : 'text-muted-foreground'}`}>
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
                          className={profileTextareaClass}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between mt-2">
                        <FormDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground leading-relaxed max-w-[200px]">Used for intent-based smart matching.</FormDescription>
                        <span className={`text-[10px] font-bold tracking-widest ${teachIntentCount > 470 ? 'text-destructive' : 'text-muted-foreground'}`}>
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
                          className={profileTextareaClass}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between mt-2">
                        <FormDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground leading-relaxed max-w-[200px]">Keep it practical and specific for better matches.</FormDescription>
                        <span className={`text-[10px] font-bold tracking-widest ${learnIntentCount > 470 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {learnIntentCount}/500
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className={cn(profileSurfaceClass, 'p-4 md:p-5 space-y-5')}>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold tracking-wide text-foreground">Public Links</h4>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">These links are shown on your profile.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={profileForm.control} name="githubUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                          <Github className="h-3.5 w-3.5" /> GitHub
                        </FormLabel>
                        <FormControl><Input {...field} placeholder="github.com/username" className={profileInputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="linkedinUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                          <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                        </FormLabel>
                        <FormControl><Input {...field} placeholder="linkedin.com/in/username" className={profileInputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="facebookUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                          <Facebook className="h-3.5 w-3.5" /> Facebook
                        </FormLabel>
                        <FormControl><Input {...field} placeholder="facebook.com/username" className={profileInputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="websiteUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" /> Website
                        </FormLabel>
                        <FormControl><Input {...field} placeholder="your-portfolio.com" className={profileInputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="space-y-3">
                    <FormField control={profileForm.control} name="resumeUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Resume URL</FormLabel>
                        <FormControl><Input {...field} placeholder="Auto-filled after PDF upload" className={profileInputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={resumeInputRef}
                        type="file"
                        accept="application/pdf,image/png,image/jpeg,image/webp"
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
                        className="rounded-xl"
                        disabled={uploadingResume}
                        onClick={() => resumeInputRef.current?.click()}
                      >
                        {uploadingResume ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                        {uploadingResume ? 'Scanning...' : 'Scan CV & Fill Profile'}
                      </Button>
                      {resumeProfile && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                          onClick={() => primeResumeReview(resumeProfile)}
                        >
                          Review Last Scan
                        </Button>
                      )}
                      {profileForm.watch('resumeUrl')?.trim() && (
                        <Button type="button" variant="ghost" className="rounded-xl text-primary hover:text-primary" asChild>
                          <a href={toResumeHref(profileForm.watch('resumeUrl'))} target="_blank" rel="noreferrer">Open Resume</a>
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      PDF text is extracted automatically. Scanned image resumes need OCR enabled on the backend.
                    </p>
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
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              {profileJustSaved && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold">Profile saved</p>
                    <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-100/80">Your text fields are hidden now. Use Edit when you need to change them again.</p>
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
                  <div key={label} className={cn(profileFieldClass, label === 'Bio' && 'sm:col-span-2')}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold text-foreground">
                      {value?.trim() || 'Not added'}
                    </p>
                  </div>
                ))}
              </div>

              <div className={cn(profileSurfaceClass, 'p-4 md:p-5')}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold tracking-wide text-foreground">Public Links</h4>
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
                    <div key={label} className={cn(profileLinkFieldClass, label === 'Resume URL' && 'sm:col-span-2')}>
                      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </p>
                      {value?.trim() ? (
                        <a
                          href={label === 'Resume URL' ? toResumeHref(value) : value.trim()}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-words text-sm font-semibold text-primary hover:underline"
                        >
                          {value.trim()}
                        </a>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">Not added</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="product-panel mt-6">
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
              <div key={label} className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-center transition-colors hover:border-primary/25 hover:bg-primary/5">
                <p className="font-headline text-3xl font-black text-foreground transition-colors">{value}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">{label}</p>
              </div>
            ))}
          </div>
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
                  const res = await fetch(compressed);
                  const blob = await res.blob();
                  const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

                  const upRes = await UserService.uploadFile(file);
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

      <Dialog open={resumeReviewOpen} onOpenChange={(open) => !applyingResumeProfile && setResumeReviewOpen(open)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Review CV profile scan
            </DialogTitle>
            <DialogDescription>
              Confirm what should be written to your SkillEX profile and skills.
            </DialogDescription>
          </DialogHeader>

          {resumeProfile && (
            <div className="space-y-5">

              {/* Header strip */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {resumeProfile.extractionMethod} / {resumeProfile.status}
                    </p>
                    <h4 className="mt-1 text-lg font-extrabold text-foreground">
                      {resumeProfile.headline || 'Resume profile'}
                    </h4>
                  </div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    {resumeProfile.confidence}% confidence
                  </Badge>
                </div>
                {resumeProfile.rawTextPreview && resumeProfile.status === 'NEEDS_REVIEW' && (
                  <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                    Only a small amount of text was extracted. If this is a scanned resume, enable OCR on the backend or upload a selectable-text PDF.
                  </p>
                )}
              </div>

              {/* Contact info */}
              {(resumeProfile.email || resumeProfile.phone || resumeProfile.address) && (
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Contact</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {resumeProfile.email && (
                      <span className="text-xs text-foreground"><span className="font-bold text-muted-foreground">Email: </span>{resumeProfile.email}</span>
                    )}
                    {resumeProfile.phone && (
                      <span className="text-xs text-foreground"><span className="font-bold text-muted-foreground">Phone: </span>{resumeProfile.phone}</span>
                    )}
                    {resumeProfile.address && (
                      <span className="text-xs text-foreground"><span className="font-bold text-muted-foreground">Location: </span>{resumeProfile.address}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Apply-to-profile toggles */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Bio', checked: applyResumeBio, setChecked: setApplyResumeBio, value: resumeProfile.experienceSummary || resumeProfile.projectSummary || resumeProfile.headline },
                  { label: 'Teach intent', checked: applyResumeTeachIntent, setChecked: setApplyResumeTeachIntent, value: resumeProfile.teachSummary },
                  { label: 'Contact info', checked: applyResumeContact, setChecked: setApplyResumeContact, value: [resumeProfile.phone, resumeProfile.address].filter(Boolean).join(' · ') || null },
                ].map(({ label, checked, setChecked, value }) => (
                  <label key={label} className="rounded-2xl border border-border bg-muted/30 p-4 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Checkbox checked={checked} onCheckedChange={(next) => setChecked(Boolean(next))} />
                      {label}
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                      {value?.trim() || 'No confident value extracted.'}
                    </span>
                  </label>
                ))}
              </div>

              {/* CV sections */}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Education', value: resumeProfile.educationSummary },
                  { label: 'Experience', value: resumeProfile.experienceSummary },
                  { label: 'Projects', value: resumeProfile.projectSummary },
                  { label: 'Certifications', value: resumeProfile.certificationSummary },
                  { label: 'Tools & Software', value: resumeProfile.toolsSummary },
                  { label: 'Languages', value: resumeProfile.languageSummary },
                  { label: 'Career Goal', value: resumeProfile.careerGoal },
                ]
                  .filter((s) => s.value?.trim())
                  .map((section) => (
                    <div key={section.label} className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{section.label}</p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{section.value}</p>
                    </div>
                  ))}
              </div>

              {/* Evidence signals */}
              {(resumeProfile.profileSignals ?? []).length > 0 && (
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Achievements & Signals</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(resumeProfile.profileSignals ?? []).map((signal, index) => (
                      <div key={`${signal.label}-${index}`} className="rounded-xl border border-border bg-background p-3">
                        <p className="text-xs font-bold text-foreground">{signal.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{signal.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills I can teach */}
              <div>
                <h4 className="text-sm font-extrabold text-foreground mb-1">Skills I can teach</h4>
                <p className="text-xs text-muted-foreground mb-3">Tick to add as offered skills on your profile.</p>
                {(resumeProfile.suggestedOfferedSkills ?? []).length === 0 ? (
                  <p className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    No resume-backed teaching skills found.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(resumeProfile.suggestedOfferedSkills ?? []).map((skill) => {
                      const key = skillSuggestionKey(skill);
                      return (
                        <label key={key} className="block rounded-2xl border border-border bg-background p-4 cursor-pointer">
                          <span className="flex items-start gap-3">
                            <Checkbox
                              className="mt-1"
                              checked={selectedOfferedResumeSkills.has(key)}
                              onCheckedChange={() => toggleResumeSkill(key)}
                            />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-foreground">{skill.name}</span>
                                <Badge variant="secondary" className="text-[10px]">{skill.level}</Badge>
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">{skill.evidence}</span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* What I want to learn */}
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-2">
                <h4 className="text-sm font-extrabold text-foreground">What do you want to learn?</h4>
                <p className="text-xs text-muted-foreground">
                  Your CV shows what you've done, not what you want to learn. Type it here — smart matching
                  will link it to real SkillEX skills and mentors.
                </p>
                <textarea
                  className="w-full resize-none rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                  placeholder="e.g. I want to learn digital marketing, data analysis, or advanced Excel..."
                  value={learnIntentDraft}
                  onChange={(e) => setLearnIntentDraft(e.target.value)}
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-right">{learnIntentDraft.length}/500</p>
              </div>

            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResumeReviewOpen(false)} disabled={applyingResumeProfile}>
              Cancel
            </Button>
            <Button onClick={applyResumeProfile} disabled={!resumeProfile || applyingResumeProfile}>
              {applyingResumeProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {applyingResumeProfile ? 'Applying...' : 'Apply Selected Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
