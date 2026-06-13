
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowRight, Check, Sparkles,
  Film, Music, Code, Camera, Mic, Database, Paintbrush, PenTool,
  Laptop, Disc, Box, Megaphone, Languages, ChefHat, Palette,
  Table, AppWindow, BookOpen, Globe, Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserService } from '@/services/userService';
import { SkillService } from '@/services/skillService';
import type { Skill } from '@/types';
import AppBackButton from '@/components/navigation/AppBackButton';

// ── Fallback static catalog (used while API loads) ────────────
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Film, Music, Code, Camera, Mic, Database, Paintbrush, PenTool,
  Laptop, Disc, Box, Megaphone, Languages, ChefHat, Palette,
  Table, AppWindow, BookOpen, Globe, Lightbulb,
};

const FALLBACK_CATALOG: Omit<Skill, 'level' | 'description'>[] = [
  { id: 'skill-1', name: 'Video Editing', icon: 'Film', category: 'Creative' },
  { id: 'skill-2', name: 'Guitar', icon: 'Music', category: 'Creative' },
  { id: 'skill-3', name: 'Python', icon: 'Code', category: 'Tech' },
  { id: 'skill-4', name: 'Photography', icon: 'Camera', category: 'Creative' },
  { id: 'skill-5', name: 'Public Speaking', icon: 'Mic', category: 'Communication' },
  { id: 'skill-6', name: 'Data Science', icon: 'Database', category: 'Tech' },
  { id: 'skill-7', name: 'Graphic Design', icon: 'Paintbrush', category: 'Design' },
  { id: 'skill-8', name: 'English Writing', icon: 'PenTool', category: 'Language' },
  { id: 'skill-9', name: 'Web Dev', icon: 'Laptop', category: 'Tech' },
  { id: 'skill-10', name: 'Music Production', icon: 'Disc', category: 'Creative' },
  { id: 'skill-11', name: '3D Modeling', icon: 'Box', category: 'Design' },
  { id: 'skill-12', name: 'Digital Marketing', icon: 'Megaphone', category: 'Business' },
  { id: 'skill-13', name: 'French Language', icon: 'Languages', category: 'Language' },
  { id: 'skill-14', name: 'Cooking', icon: 'ChefHat', category: 'Lifestyle' },
  { id: 'skill-15', name: 'Drawing', icon: 'Palette', category: 'Creative' },
  { id: 'skill-16', name: 'Excel', icon: 'Table', category: 'Business' },
  { id: 'skill-17', name: 'UI/UX Design', icon: 'AppWindow', category: 'Design' },
  { id: 'skill-18', name: 'Research', icon: 'BookOpen', category: 'Academic' },
  { id: 'skill-19', name: 'Language Exchange', icon: 'Globe', category: 'Language' },
  { id: 'skill-20', name: 'Critical Thinking', icon: 'Lightbulb', category: 'Academic' },
];

// ── Schemas ───────────────────────────────────────────────────
const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  university: z.string().min(2, 'University must be at least 2 characters'),
});
type Step1Data = z.infer<typeof step1Schema>;

// ── Sub-components ────────────────────────────────────────────
const STEPS = ['Identity', 'Outgoing Payload', 'Incoming Query'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-10 relative z-10 w-full max-w-sm mx-auto">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{
                scale: i === current ? 1.1 : 0.9,
                backgroundColor: i < current ? 'hsl(var(--primary))' : i === current ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.05)',
                borderColor: i <= current ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)'
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.1)]",
                i === current ? "shadow-[0_0_20px_hsl(var(--primary)/0.4)]" : ""
              )}
            >
              {i < current
                ? <Check className="w-5 h-5 text-primary-foreground drop-shadow-sm" />
                : <span className={cn('font-bold text-[10px] tracking-widest', i === current ? 'text-primary-foreground' : 'text-muted-foreground')}>{i + 1}</span>
              }
            </motion.div>
            <span className={cn('text-[9px] uppercase font-bold tracking-widest whitespace-nowrap hidden sm:block', i === current ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-muted-foreground')}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <motion.div
              className="h-px flex-grow max-w-[40px] mt-[-20px] shadow-[0_0_5px_rgba(0,0,0,0.5)]"
              animate={{ backgroundColor: i < current ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function SkillCard({
  skill, selected, onToggle, disabled,
}: {
  skill: Omit<Skill, 'level' | 'description'>;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const Icon = ICON_MAP[skill.icon] ?? Lightbulb;
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      whileHover={{ scale: disabled && !selected ? 1 : 1.03 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border text-sm font-bold transition-all duration-300 cursor-pointer select-none overflow-hidden group',
        selected
          ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)] inset-shadow-sm scale-100'
          : disabled
            ? 'border-white/5 bg-black/40 text-muted-foreground/30 cursor-not-allowed grayscale'
            : 'border-white/10 bg-white/5 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-white hover:shadow-[0_0_15px_hsl(var(--primary)/0.1)]',
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-[0_0_8px_hsl(var(--primary)/0.8)] z-10"
        >
          <Check className="w-3 h-3 text-primary-foreground stroke-[3px]" />
        </motion.div>
      )}
      <Icon className={cn("w-7 h-7 relative z-10 transition-colors duration-300", selected ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" : "group-hover:text-primary")} />
      <div className="flex flex-col items-center gap-0.5 relative z-10">
        <span className="text-[11px] uppercase tracking-widest text-center leading-tight whitespace-nowrap truncate w-full px-1">{skill.name}</span>
        <span className="text-[9px] uppercase tracking-widest opacity-60 text-center">{skill.category}</span>
      </div>
      {selected && <div className="absolute inset-0 bg-primary/5 blur-xl block" />}
    </motion.button>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function OnboardingPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const [skillCatalog, setSkillCatalog] = useState<Omit<Skill, 'level' | 'description'>[]>(FALLBACK_CATALOG);

  // A guest with no session can't complete onboarding (no user to attach skills
  // to). Send them to sign in rather than showing a form that silently no-ops.
  useEffect(() => {
    if (!isLoading && !user) navigate('/login');
  }, [isLoading, user, navigate]);

  useEffect(() => {
    SkillService.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) setSkillCatalog(list as Omit<Skill, 'level' | 'description'>[]);
      })
      .catch(() => {}); // keep fallback on error
  }, []);

  const [profileData, setProfileData] = useState<Step1Data>({ name: '', university: '' });
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [skillsWanted, setSkillsWanted] = useState<string[]>([]);

  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: user?.name || '', university: user?.university || '' },
  });

  const go = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); };

  const toggleSkill = (id: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(id)) { setList(list.filter((s) => s !== id)); return; }
    if (list.length >= 3) return;
    setList([...list, id]);
  };

  const handleStep1 = form.handleSubmit((data) => {
    setProfileData(data);
    go(1);
  });

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await UserService.updateProfile(user.id, {
        name: profileData.name,
        university: profileData.university,
      });
      await Promise.all([
        ...skillsOffered.map((id) => UserService.addSkill(id, 'offered', 'BEGINNER')),
        ...skillsWanted.map((id) => UserService.addSkill(id, 'wanted', 'BEGINNER')),
      ]);
      // Refresh the cached user so the dashboard immediately reflects the new
      // profile + skills instead of the empty just-registered snapshot.
      await refreshUser().catch(() => {});
      go(3); // success screen
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (e) {
      console.error('Onboarding save failed', e);
      toast({
        title: 'Setup failed',
        description: e instanceof Error ? e.message : 'Could not save your profile. Please try again.',
        variant: 'destructive',
      });
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      <AppBackButton fallbackTo="/dashboard" className="absolute left-4 top-4 z-30" />
      <div className="w-full max-w-xl relative z-20">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 relative"
        >
          <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-primary bg-[length:200%_auto] animate-gradient-slow font-headline drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">SkillEX</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">Let's set up your profile — takes 60 seconds.</p>
        </motion.div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/5 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] rounded-[2rem] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
          
          <StepIndicator current={step} />

          <AnimatePresence mode="wait" custom={dir}>
            {/* ── Step 0: Basic info ── */}
            {step === 0 && (
              <motion.div key="step0" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 mt-6">
                <h2 className="text-2xl font-extrabold font-headline mb-1 tracking-tight text-white drop-shadow-sm">What should we call you?</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-8">This is your public designation.</p>
                <Form {...form}>
                  <form onSubmit={handleStep1} className="space-y-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Your full name" autoFocus className="h-12 bg-black/50 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium pl-4" />
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold tracking-widest" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="university" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Your university or institution" className="h-12 bg-black/50 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium pl-4" />
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold tracking-widest" />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all mt-4 border-0">
                      Continue <ArrowRight className="ml-2 w-4 h-4 drop-shadow-sm" />
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* ── Step 1: Skills to teach ── */}
            {step === 1 && (
              <motion.div key="step1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold font-headline mb-1 tracking-tight text-white drop-shadow-sm">Outgoing Payload</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-normal leading-relaxed">Pick up to <strong className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">3 modules</strong> to transmit.</p>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
                    {skillsOffered.length}/3 selected
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8 max-h-[40vh] overflow-y-auto px-1 pb-4 custom-scrollbar">
                  {skillCatalog.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      selected={skillsOffered.includes(skill.id)}
                      disabled={!skillsOffered.includes(skill.id) && skillsOffered.length >= 3}
                      onToggle={() => toggleSkill(skill.id, skillsOffered, setSkillsOffered)}
                    />
                  ))}
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-[1] h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-muted-foreground hover:text-white shadow-none" onClick={() => go(0)}>Rewind</Button>
                  <Button
                    className="flex-[2] h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-0 disabled:shadow-none disabled:bg-primary/20"
                    disabled={skillsOffered.length === 0}
                    onClick={() => go(2)}
                  >
                    Proceed to Input <ArrowRight className="ml-2 w-4 h-4 drop-shadow-sm" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Skills to learn ── */}
            {step === 2 && (
              <motion.div key="step2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold font-headline mb-1 tracking-tight text-white drop-shadow-sm">Incoming Query</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-normal leading-relaxed">Pick up to <strong className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">3 modules</strong> to acquire.</p>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
                    {skillsWanted.length}/3 selected
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8 max-h-[40vh] overflow-y-auto px-1 pb-4 custom-scrollbar">
                  {skillCatalog.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      selected={skillsWanted.includes(skill.id)}
                      disabled={!skillsWanted.includes(skill.id) && skillsWanted.length >= 3}
                      onToggle={() => toggleSkill(skill.id, skillsWanted, setSkillsWanted)}
                    />
                  ))}
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-[1] h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-muted-foreground hover:text-white shadow-none" onClick={() => go(1)}>Rewind</Button>
                  <Button
                    className="flex-[2] h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-0 disabled:shadow-none disabled:bg-primary/20"
                    disabled={skillsWanted.length === 0 || saving}
                    onClick={handleFinish}
                  >
                    {saving ? 'Compiling...' : 'Finalize Sequence'} <Sparkles className="ml-2 w-4 h-4 drop-shadow-sm" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Success ── */}
            {step === 3 && (
              <motion.div key="step3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="text-center py-10 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_hsl(var(--primary)/0.4)] relative"
                >
                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
                  <Check className="w-12 h-12 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)] relative z-10 stroke-[3px]" />
                </motion.div>
                <h2 className="text-3xl font-extrabold font-headline mb-3 tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Sync Complete</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Routing to Main Hub terminal...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
