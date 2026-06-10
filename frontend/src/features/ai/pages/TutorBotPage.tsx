import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  ArrowLeft,
  Settings2,
  Trash2,
  RotateCcw,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTutorConversation } from '@/hooks/useTutorConversation';
import { TutorChatBox } from '../components/TutorChatBox';
import { SkillService } from '@/services/skillService';
import type { Skill } from '@/types';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function TutorBotPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
          title: 'Error',
          description: 'Failed to load skill',
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

  const quizMessage = messages.find((m) => m.metadata?.isQuiz);

  if (!skillId) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-lg font-semibold">Skill not found</p>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <motion.div
          className="border-b border-border bg-card p-4"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold">AI Tutor</h1>
                </div>
                {skill && (
                  <p className="text-sm text-muted-foreground">
                    Learning <span className="font-semibold text-foreground">{skill.name}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Stats */}
              {stats && (
                <motion.div
                  className="flex items-center gap-4 px-4 py-2 rounded-lg bg-muted/50"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{stats.totalQuestions}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{Math.round(stats.accuracy)}%</span>
                  </div>
                </motion.div>
              )}

              {/* Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
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
                className="mt-4 pt-4 border-t border-border space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearMessages}
                    disabled={messages.length === 0 || settingsLoading}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear Messages
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteConversation}
                    disabled={settingsLoading}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete All
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clear messages to restart the conversation while keeping your quiz stats. Delete all to remove this conversation permanently.
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
            className="h-full"
          />
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-2"
          >
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
