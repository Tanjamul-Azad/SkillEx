import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, FileText, ArrowRight } from 'lucide-react';
import BioSuggestionModal from '../components/BioSuggestionModal';
import SkillDescriptionEditor from '../components/SkillDescriptionEditor';
import CircleBlurbModal from '../components/CircleBlurbModal';
import { UserService } from '@/services/userService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Skill } from '@/types';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ProfileAssistantPage() {
  useDocumentTitle('Profile Assistant');
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [circleBlurbOpen, setCircleBlurbOpen] = useState(false);

  const skillsOffered = user?.skillsOffered ?? [];

  const handleBioSelect = async (bio: string) => {
    if (!user) return;
    try {
      await UserService.updateProfile(user.id, { bio });
      await refreshUser();
      toast({
        title: 'Bio updated',
        description: 'Your new bio is live on your profile.',
      });
    } catch (error) {
      toast({
        title: 'Could not update your bio',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const handlePickSkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setSkillPickerOpen(false);
    setSkillEditorOpen(true);
  };

  const handleSkillDescriptionSave = async (description: string) => {
    if (!selectedSkill) return;
    try {
      await UserService.updateSkillDescription(selectedSkill.id, description);
      await refreshUser();
    } catch (error) {
      toast({
        title: 'Could not save the description',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const tools = [
    {
      key: 'bio',
      icon: FileText,
      title: 'Bio',
      description: 'Turn a few rough lines about yourself into a profile-ready introduction.',
      status:
        user?.bio && user.bio.length > 0
          ? `Current: "${user.bio.substring(0, 90)}${user.bio.length > 90 ? '…' : ''}"`
          : "You haven't written a bio yet.",
      action: 'Write My Bio',
      disabled: false,
      onOpen: () => setBioModalOpen(true),
    },
    {
      key: 'skills',
      icon: BookOpen,
      title: 'Skill Descriptions',
      description: 'Give each skill you teach a clear description learners can trust.',
      status:
        skillsOffered.length > 0
          ? `${skillsOffered.length} skill${skillsOffered.length !== 1 ? 's' : ''} on your profile.`
          : 'Add a skill you teach to use this.',
      action: 'Describe a Skill',
      disabled: skillsOffered.length === 0,
      onOpen: () => skillsOffered.length > 0 && setSkillPickerOpen(true),
    },
    {
      key: 'circles',
      icon: Users,
      title: 'Circle Blurbs',
      description: 'Write a short, inviting intro for a circle or group you run.',
      status: 'Ready to paste into any circle description.',
      action: 'Draft a Blurb',
      disabled: false,
      onOpen: () => setCircleBlurbOpen(true),
    },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mx-auto max-w-5xl space-y-8 py-8"
      >
        <motion.div variants={itemVariants} className="space-y-1.5">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground">
            Profile Assistant
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Start from rough notes — each tool drafts three variations for you to pick from,
            edit, and apply to your profile.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tools.map((tool) => (
            <motion.div
              key={tool.key}
              variants={itemVariants}
              role="button"
              tabIndex={tool.disabled ? -1 : 0}
              onClick={tool.onOpen}
              onKeyDown={(e) => {
                if (!tool.disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  tool.onOpen();
                }
              }}
              className={cn(
                'rounded-2xl border border-border/40 bg-card transition-colors',
                tool.disabled ? 'opacity-70' : 'cursor-pointer hover:border-primary/40'
              )}
            >
              <div className="flex h-full flex-col p-6">
                <div className="rounded-xl bg-primary/10 p-2.5 self-start">
                  <tool.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-4 font-headline text-lg font-extrabold text-foreground">
                  {tool.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                <p className="mt-4 flex-1 text-xs italic text-muted-foreground/80">
                  {tool.status}
                </p>
                <Button
                  className="mt-5 w-full gap-2 rounded-xl"
                  variant={tool.key === 'bio' ? 'default' : 'outline'}
                  disabled={tool.disabled}
                  tabIndex={-1}
                >
                  {tool.action}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Modals */}
      <BioSuggestionModal
        open={bioModalOpen}
        onOpenChange={setBioModalOpen}
        onSelectBio={handleBioSelect}
      />

      <Dialog open={skillPickerOpen} onOpenChange={setSkillPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pick a skill</DialogTitle>
            <DialogDescription>
              Choose which of your offered skills to write a description for.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {skillsOffered.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => handlePickSkill(skill)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                {skill.icon && <span className="shrink-0 text-xl">{skill.icon}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{skill.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {skill.subtitle || 'No description yet'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SkillDescriptionEditor
        key={selectedSkill?.id ?? 'none'}
        open={skillEditorOpen}
        onOpenChange={setSkillEditorOpen}
        skillName={selectedSkill?.name || ''}
        skillLevel={selectedSkill?.level || 'beginner'}
        currentDescription={selectedSkill?.subtitle}
        onSaveDescription={handleSkillDescriptionSave}
      />

      <CircleBlurbModal open={circleBlurbOpen} onOpenChange={setCircleBlurbOpen} />
    </DashboardLayout>
  );
}
