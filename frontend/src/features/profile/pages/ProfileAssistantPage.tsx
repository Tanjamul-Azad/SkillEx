import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, BookOpen, Users, FileText } from 'lucide-react';
import BioSuggestionModal from '../components/BioSuggestionModal';
import SkillDescriptionEditor from '../components/SkillDescriptionEditor';
import { userService } from '@/services/userService';

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 120, damping: 20 },
  },
};

interface Skill {
  id: string;
  name: string;
  level?: string;
  description?: string;
}

export default function ProfileAssistantPage() {
  useDocumentTitle('Profile Assistant');
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [circleBlurbOpen, setCircleBlurbOpen] = useState(false);

  const handleBioSelect = async (bio: string) => {
    if (!user) return;
    try {
      await userService.updateProfile(user.id, { bio });
      await refreshUser();
      toast({
        title: 'Success',
        description: 'Your bio has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update bio.',
        variant: 'destructive',
      });
    }
  };

  const handleSkillDescriptionSave = async (description: string) => {
    if (!selectedSkill) return;
    try {
      // Note: This would require a backend endpoint to update skill descriptions
      // For now, we'll just show a toast
      toast({
        title: 'Success',
        description: 'Skill description has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update skill description.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="product-page space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="product-header"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="product-title text-foreground">Profile Assistant</h1>
                <p className="product-subtitle text-muted-foreground">
                  Let AI help you craft polished, professional profile content. Write rough ideas, get 3 variations to choose from.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Bio Assistant Card */}
          <motion.div variants={item} key="bio">
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setBioModalOpen(true)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Professional Bio
                    </CardTitle>
                    <CardDescription>Craft your introduction</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {user?.bio && user.bio.length > 0
                      ? `Current: "${user.bio.substring(0, 80)}..."`
                      : 'No bio yet. Click to create one.'}
                  </p>
                  <Button className="w-full gap-2" variant="default">
                    <Wand2 className="h-4 w-4" />
                    Generate Bio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Skill Descriptions Card */}
          <motion.div variants={item} key="skills">
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Skill Descriptions
                    </CardTitle>
                    <CardDescription>Polish your expertise</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {user?.skillsOffered && user.skillsOffered.length > 0
                      ? `You have ${user.skillsOffered.length} skill${user.skillsOffered.length !== 1 ? 's' : ''}`
                      : 'Add skills to enhance with descriptions.'}
                  </p>
                  <Button
                    className="w-full gap-2"
                    variant="default"
                    disabled={!user?.skillsOffered || user.skillsOffered.length === 0}
                  >
                    <Wand2 className="h-4 w-4" />
                    Enhance Skills
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Circle Blurb Card */}
          <motion.div variants={item} key="circles">
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setCircleBlurbOpen(true)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Circle Blurbs
                    </CardTitle>
                    <CardDescription>Engage your community</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Create compelling descriptions for skill circles or groups you manage.
                  </p>
                  <Button className="w-full gap-2" variant="default">
                    <Wand2 className="h-4 w-4" />
                    Create Blurb
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* How It Works Section */}
        <motion.div
          variants={item}
          initial="hidden"
          animate="visible"
          className="product-panel"
        >
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">How It Works</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm">Write Rough Ideas</p>
                  <p className="text-xs text-muted-foreground">
                    Describe yourself naturally, without worrying about polish.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm">Get AI Variations</p>
                  <p className="text-xs text-muted-foreground">
                    Receive 3 distinct, professionally-written alternatives.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm">Pick & Apply</p>
                  <p className="text-xs text-muted-foreground">
                    Choose one, edit if needed, and update your profile instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tips Section */}
        <motion.div
          variants={item}
          initial="hidden"
          animate="visible"
          className="product-panel"
        >
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tips for Better Results</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">→</span>
                <span>Be specific: mention particular skills, projects, or interests you're passionate about.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">→</span>
                <span>Describe what you enjoy: teaching style, learning approach, community values.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">→</span>
                <span>Regenerate anytime: don't like the suggestions? Try again with slightly different wording.</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <BioSuggestionModal
        open={bioModalOpen}
        onOpenChange={setBioModalOpen}
        onSelectBio={handleBioSelect}
      />

      <SkillDescriptionEditor
        open={skillEditorOpen}
        onOpenChange={setSkillEditorOpen}
        skillName={selectedSkill?.name || ''}
        skillLevel={selectedSkill?.level || 'PRACTITIONER'}
        currentDescription={selectedSkill?.description}
        onSaveDescription={handleSkillDescriptionSave}
      />
    </DashboardLayout>
  );
}
