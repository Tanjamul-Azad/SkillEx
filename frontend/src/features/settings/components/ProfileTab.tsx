import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User as UserIcon, PencilLine, Camera, CheckCircle2,
  Github, Linkedin, Facebook, Globe, FileUp, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { UserService } from '@/services/userService';
import { api } from '@/services/api';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

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

type ProfileFormData = z.infer<typeof profileSchema>;

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

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

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
  }, [user, profileForm]);

  const handleEditProfile = () => {
    setProfileEditMode(true);
    setProfileJustSaved(false);
  };

  const handleCancelProfileEdit = () => {
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

  const handleResumePick = async (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ variant: 'destructive', title: 'PDF only', description: 'Resume must be a PDF file.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Resume size must be 10MB or less.' });
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
  };

  const charCount = profileForm.watch('bio')?.length ?? 0;
  const teachIntentCount = profileForm.watch('teachIntentText')?.length ?? 0;
  const learnIntentCount = profileForm.watch('learnIntentText')?.length ?? 0;
  const profileValues = profileForm.watch();
  const hasProfileChanges = profileForm.formState.isDirty;

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
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                    : 'border-white/10 bg-white/5 text-muted-foreground'
                  : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
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
              <div key={label} className="rounded-2xl bg-black/50 border border-white/5 p-4 text-center group hover:bg-white/5 transition-colors">
                <p className="font-headline text-3xl font-black text-white group-hover:text-primary transition-colors">{value}</p>
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
    </>
  );
}
