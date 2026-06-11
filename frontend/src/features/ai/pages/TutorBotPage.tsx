import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  ArrowLeft,
  Settings2,
  Trash2,
  RotateCcw,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTutorConversation } from '@/hooks/useTutorConversation';
import { TutorChatBox } from '../components/TutorChatBox';
import { SkillService } from '@/services/skillService';
import type { Skill } from '@/types';

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function TutorBotPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const {
    messages,
    sending,
    error,
    sendMessage,
    submitQuizAnswer,
    clearMessages,
    deleteConversation,
    loadConversation,
    stats,
    loading,
  } = useTutorConversation({
    skillId: skillId || '',
    autoLoad: !!skillId,
  });

  // Load skill details
  useEffect(() => {
    if (!skillId) return;

    SkillService.getById(skillId)
      .then(setSkill)
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Skill not found',
          description: 'That skill no longer exists.',
        });
        navigate('/dashboard');
      });
  }, [skillId, navigate, toast]);

  const handleClearMessages = async () => {
    if (window.confirm('Clear all messages? Your quiz stats will be preserved.')) {
      setSettingsLoading(true);
      try {
        await clearMessages();
        setShowSettings(false);
      } finally {
        setSettingsLoading(false);
      }
    }
  };

  const handleDeleteConversation = async () => {
    if (window.confirm('Delete this conversation permanently? This cannot be undone.')) {
      setSettingsLoading(true);
      try {
        await deleteConversation();
        navigate('/dashboard');
      } finally {
        setSettingsLoading(false);
      }
    }
  };

  if (!skillId) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="space-y-4 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-lg font-semibold text-foreground">
              Pick a skill to open its tutor
            </p>
            <Button className="rounded-xl" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <motion.div
          className="border-b border-border/40 bg-card p-4"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-headline text-xl font-extrabold tracking-tight text-foreground">
                    {skill ? `${skill.name} Tutor` : 'Tutor'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ask questions, get explanations, quiz yourself.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {stats && stats.totalQuestions > 0 && (
                <div className="hidden items-center gap-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-2 sm:flex">
                  <div className="flex items-center gap-1.5" title="Questions answered">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{stats.totalQuestions}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5" title="Quiz accuracy">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-foreground">{Math.round(stats.accuracy)}%</span>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Conversation settings"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3 border-t border-border/40 pt-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearMessages}
                    disabled={messages.length === 0 || settingsLoading}
                    className="gap-2 rounded-xl"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear Messages
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteConversation}
                    disabled={settingsLoading}
                    className="gap-2 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Conversation
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clearing keeps your quiz stats. Deleting removes everything permanently.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          className="flex-1 overflow-hidden"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <TutorChatBox
            messages={messages}
            loading={loading}
            sending={sending}
            onSendMessage={sendMessage}
            onQuizAnswer={(messageId, answerIndex) => submitQuizAnswer(messageId, answerIndex)}
            className="h-full"
          />
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 border-t border-destructive/30 bg-destructive/10 px-4 py-2"
          >
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-lg"
              onClick={loadConversation}
            >
              Try again
            </Button>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
