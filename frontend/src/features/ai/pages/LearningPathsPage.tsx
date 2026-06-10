import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, Clock, Target, X, Play } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { learningPathService, type LearningPath } from '@/services/learningPathService';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function LearningPathsPage() {
  const { toast } = useToast();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      const result = await learningPathService.list();
      setPaths(result);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load learning paths',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async (pathId: string, stepOrder: number) => {
    try {
      await learningPathService.completeStep(pathId, stepOrder);
      await loadPaths();
      toast({ title: 'Step completed!', description: 'Great progress!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to mark step complete' });
    }
  };

  const handleCancelPath = async (pathId: string) => {
    if (!window.confirm('Cancel this learning path?')) return;

    try {
      await learningPathService.cancel(pathId);
      await loadPaths();
      toast({ title: 'Path cancelled' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to cancel path' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Sparkles className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mx-auto max-w-5xl space-y-8 py-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">AI-Generated Learning Paths</span>
          </div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground mt-4">
            Your Personalized Curricula
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            AI-matched mentors for each step. Track your progress and celebrate milestones.
          </p>
        </motion.div>

        {/* Empty State */}
        {paths.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-border/40 bg-card p-12 text-center"
          >
            <Target className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-semibold text-foreground">No active learning paths</p>
            <p className="mt-2 text-muted-foreground">
              Visit the Skill-Gap Analyzer to generate your first personalized path.
            </p>
            <Button asChild className="mt-6 rounded-xl">
              <a href="/ai/skill-gap">Create Your First Path</a>
            </Button>
          </motion.div>
        )}

        {/* Paths */}
        <div className="space-y-6">
          {paths.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              onCompleteStep={handleCompleteStep}
              onCancel={handleCancelPath}
            />
          ))}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

function PathCard({
  path,
  onCompleteStep,
  onCancel,
}: {
  path: LearningPath;
  onCompleteStep: (pathId: string, stepOrder: number) => void;
  onCancel: (pathId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      }}
      className="rounded-2xl border border-border/40 bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-card to-card border-b border-border/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-headline text-2xl font-extrabold text-foreground truncate">
                {path.goalSkillName}
              </h3>
              <Badge variant="secondary" className="capitalize">
                {path.targetLevel}
              </Badge>
              <Badge variant="outline">
                {Math.round(path.progressPercent)}% complete
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {path.steps.length} steps • {path.totalEstimatedHours} hours
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(path.id)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/50">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${path.progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-0 divide-y divide-border/40">
        <AnimatePresence>
          {(expanded ? path.steps : path.steps.slice(0, 2)).map((step, idx) => (
            <StepCard
              key={step.order}
              step={step}
              pathId={path.id}
              index={idx}
              onComplete={() => onCompleteStep(path.id, step.order)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Expand */}
      {path.steps.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-border/40 px-6 py-3 text-sm font-semibold text-primary hover:bg-muted/30 transition-colors text-center"
        >
          {expanded ? 'Show less' : `Show ${path.steps.length - 2} more steps`}
        </button>
      )}

      {/* Actions */}
      {path.status === 'ACTIVE' && (
        <div className="border-t border-border/40 bg-muted/10 px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl">
            Pause Path
          </Button>
          <Button className="flex-1 rounded-xl">
            <Play className="h-4 w-4 mr-2" />
            Start Next Session
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function StepCard({
  step,
  pathId,
  index,
  onComplete,
}: {
  step: any;
  pathId: string;
  index: number;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="p-6 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary text-sm">
          {step.order}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-foreground">{step.skillName}</h4>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {step.estimatedHours}h
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>

          {/* Mentor Info */}
          <div className="flex items-center gap-2 mt-3 text-xs">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
              {step.mentorName.charAt(0)}
            </div>
            <span className="text-muted-foreground">
              with <span className="font-semibold text-foreground">{step.mentorName}</span>
            </span>
          </div>
        </div>

        {/* Status / Action */}
        {step.completed ? (
          <div className="flex items-center gap-2 text-green-600 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-semibold">Done</span>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={onComplete}
            variant="outline"
            className="shrink-0 rounded-lg h-8 text-xs"
          >
            Mark Done
          </Button>
        )}
      </div>
    </motion.div>
  );
}
