
import React, { useState } from 'react';
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
import { UserService } from '@/services/userService';
import type { Skill } from '@/types';

// ── Static skill catalog ──────────────────────────────────────
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Film, Music, Code, Camera, Mic, Database, Paintbrush, PenTool,
  Laptop, Disc, Box, Megaphone, Languages, ChefHat, Palette,
  Table, AppWindow, BookOpen, Globe, Lightbulb,
};

const SKILL_CATALOG: Omit<Skill, 'level' | 'description'>[] = [
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
const STEPS = ['About You', 'You Can Teach', 'You Want to Learn'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-10">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              animate={{
                scale: i === current ? 1 : 0.85,
                backgroundColor: i < current ? 'hsl(var(--primary))' : i === current ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            >
              {i < current
                ? <Check className="w-4 h-4 text-primary-foreground" />
                : <span className={cn('text-xs font-semibold', i === current ? 'text-primary-foreground' : 'text-muted-foreground')}>{i + 1}</span>
              }
            </motion.div>
            <span className={cn('text-xs whitespace-nowrap', i === current ? 'text-foreground font-medium' : 'text-muted-foreground')}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <motion.div
              className="h-px w-12 mt-[-16px]"
              animate={{ backgroundColor: i < current ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
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
        'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all duration-150 cursor-pointer select-none',
        selected
          ? 'border-primary bg-primary/10 text-primary shadow-md'
          : disabled
            ? 'border-border bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed'
            : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50',
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}
      <Icon className="w-6 h-6" />
      <span className="text-xs text-center leading-tight">{skill.name}</span>
      <span className="text-[10px] text-muted-foreground">{skill.category}</span>
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
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);

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
      const toSkill = (id: string, isOffered: boolean): Skill => {
        const s = SKILL_CATALOG.find((c) => c.id === id)!;
        return { ...s, level: 'beginner', description: '' };
      };
      await UserService.updateProfile(user.id, {
        name: profileData.name,
        university: profileData.university,
        skillsOffered: skillsOffered.map((id) => toSkill(id, true)),
        skillsWanted: skillsWanted.map((id) => toSkill(id, false)),
      });
      go(3); // success screen
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (e) {
      console.error('Onboarding save failed', e);
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="text-2xl font-black gradient-text font-headline">SkillEX</span>
          <p className="text-muted-foreground text-sm mt-1">Let's set up your profile — takes 60 seconds.</p>
        </motion.div>

        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <StepIndicator current={step} />

          <AnimatePresence mode="wait" custom={dir}>
            {/* ── Step 0: Basic info ── */}
            {step === 0 && (
              <motion.div key="step0" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                <h2 className="text-xl font-bold mb-1">What should we call you?</h2>
                <p className="text-muted-foreground text-sm mb-6">This will be shown on your public profile.</p>
                <Form {...form}>
                  <form onSubmit={handleStep1} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Your full name" autoFocus />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="university" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Your university or institution" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" variant="gradient" className="w-full mt-2">
                      Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* ── Step 1: Skills to teach ── */}
            {step === 1 && (
              <motion.div key="step1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                <h2 className="text-xl font-bold mb-1">What can you teach?</h2>
                <p className="text-muted-foreground text-sm mb-6">Pick up to <strong>3 skills</strong> you can share with others.</p>
                <div className="grid grid-cols-4 gap-2.5 mb-6">
                  {SKILL_CATALOG.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      selected={skillsOffered.includes(skill.id)}
                      disabled={!skillsOffered.includes(skill.id) && skillsOffered.length >= 3}
                      onToggle={() => toggleSkill(skill.id, skillsOffered, setSkillsOffered)}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => go(0)}>Back</Button>
                  <Button
                    variant="gradient"
                    className="flex-1"
                    disabled={skillsOffered.length === 0}
                    onClick={() => go(2)}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Skills to learn ── */}
            {step === 2 && (
              <motion.div key="step2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                <h2 className="text-xl font-bold mb-1">What do you want to learn?</h2>
                <p className="text-muted-foreground text-sm mb-6">Pick up to <strong>3 skills</strong> you're excited to learn.</p>
                <div className="grid grid-cols-4 gap-2.5 mb-6">
                  {SKILL_CATALOG.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      selected={skillsWanted.includes(skill.id)}
                      disabled={!skillsWanted.includes(skill.id) && skillsWanted.length >= 3}
                      onToggle={() => toggleSkill(skill.id, skillsWanted, setSkillsWanted)}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => go(1)}>Back</Button>
                  <Button
                    variant="gradient"
                    className="flex-1"
                    disabled={skillsWanted.length === 0 || saving}
                    onClick={handleFinish}
                  >
                    {saving ? 'Saving...' : 'Finish Setup'} <Sparkles className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Success ── */}
            {step === 3 && (
              <motion.div key="step3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5"
                >
                  <Check className="w-10 h-10 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
                <p className="text-muted-foreground">Taking you to your dashboard…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
