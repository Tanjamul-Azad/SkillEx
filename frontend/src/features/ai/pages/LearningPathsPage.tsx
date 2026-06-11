import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Target,
  X,
  RefreshCw,
  Loader2,
  Sparkles,
  Route,
  Users,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  learningPathService,
  type LearningPath,
  type PathStepWithMentor,
} from '@/services/learningPathService';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function LearningPathsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadPaths = useCallback(async () => {
    setLoadError(false);
    try {
      const result = await learningPathService.list();
      setPaths(result);
    } catch (error) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  const handleCompleteStep = async (pathId: string, stepOrder: number) => {
    try {
      await learningPathService.completeStep(pathId, stepOrder);
      await loadPaths();
      toast({ title: 'Step completed', description: 'Progress saved to your path.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not mark that step complete' });
    }
  };

  const handleCancelPath = async (pathId: string) => {
    if (!window.confirm('Cancel this learning path? Your completed steps stay on record.')) return;

    try {
      await learningPathService.cancel(pathId);
      await loadPaths();
      toast({ title: 'Path cancelled' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not cancel the path' });
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mx-auto max-w-5xl space-y-8 py-8"
      >
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Route className="h-3.5 w-3.5" />
            AI generated paths with real mentor matches
          </div>
          <div className="space-y-1.5">
            <h1 className="font-headline text-3xl font-extrabold text-foreground">
              Learning Paths
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Step-by-step plans toward a goal skill, each step paired with a mentor.
              Mark steps done as you go.
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton variant="custom" className="h-56 rounded-2xl" />
            <Skeleton variant="custom" className="h-56 rounded-2xl" />
          </div>
        ) : loadError ? (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-border/40 bg-card p-12 text-center"
          >
            <RefreshCw className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              Couldn't load your learning paths
            </p>
            <p className="mt-1 text-muted-foreground">Check your connection and try again.</p>
            <Button
              variant="outline"
              className="mt-6 rounded-xl"
              onClick={() => {
                setLoading(true);
                loadPaths();
              }}
            >
              Retry
            </Button>
          </motion.div>
        ) : paths.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-border/40 bg-card p-12 text-center"
          >
            <Target className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-semibold text-foreground">No learning paths yet</p>
            <p className="mt-1 text-muted-foreground">
              Run the Skill Gap Analyzer on a skill you want. It builds your first path.
            </p>
            <Button className="mt-6 rounded-xl" onClick={() => navigate('/ai/skill-gap')}>
              Analyze a Skill
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {paths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                onCompleteStep={handleCompleteStep}
                onCancel={handleCancelPath}
                onStartNext={(mentorId) => navigate(`/profile/${mentorId}`)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

function PathCard({
  path,
  onCompleteStep,
  onCancel,
  onStartNext,
}: {
  path: LearningPath;
  onCompleteStep: (pathId: string, stepOrder: number) => void;
  onCancel: (pathId: string) => void;
  onStartNext: (mentorId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextStep = path.steps.find((step) => !step.completed);
  const allDone = !nextStep && path.steps.length > 0;
  const mentorCount = new Set(path.steps.map((step) => step.mentorId).filter(Boolean)).size;

  return (
    <motion.div
      variants={itemVariants}
      className="overflow-hidden rounded-2xl border border-border/40 bg-card"
    >
      <div className="border-b border-border/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="truncate font-headline text-xl font-extrabold text-foreground">
                {path.goalSkillName}
              </h3>
              <Badge variant="secondary">
                <Sparkles className="mr-1 h-3 w-3" />
                AI path
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {path.targetLevel}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {path.steps.length} steps / {path.totalEstimatedHours} hours /{' '}
              {Math.round(path.progressPercent)}% complete
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                <Users className="mr-1 h-3 w-3" />
                {mentorCount} mentor{mentorCount !== 1 ? 's' : ''} matched
              </Badge>
              {nextStep && (
                <Badge variant="outline" className="text-xs">
                  Next: {nextStep.skillName}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${path.progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="divide-y divide-border/40">
        <AnimatePresence>
          {(expanded ? path.steps : path.steps.slice(0, 2)).map((step, idx) => (
            <StepRow
              key={step.order}
              step={step}
              index={idx}
              onComplete={() => onCompleteStep(path.id, step.order)}
            />
          ))}
        </AnimatePresence>
      </div>

      {path.steps.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-border/40 px-6 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-muted/30"
        >
          {expanded ? 'Show less' : `Show ${path.steps.length - 2} more steps`}
        </button>
      )}

      {path.status === 'ACTIVE' && (
        <div className="flex flex-col gap-3 border-t border-border/40 bg-muted/20 px-6 py-4 sm:flex-row sm:items-center">
          {allDone ? (
            <div className="flex flex-1 items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              All steps complete.
            </div>
          ) : nextStep ? (
            <div className="min-w-0 flex-1 text-sm text-muted-foreground">
              Next up: <span className="font-semibold text-foreground">{nextStep.skillName}</span>
              {nextStep.mentorName && <> with {nextStep.mentorName}</>}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => onCancel(path.id)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel Path
            </Button>
            {nextStep?.mentorId && (
              <Button className="rounded-xl" onClick={() => onStartNext(nextStep.mentorId)}>
                Book Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StepRow({
  step,
  index,
  onComplete,
}: {
  step: PathStepWithMentor;
  index: number;
  onComplete: () => void;
}) {
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete();
    } finally {
      setCompleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-6 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {step.completed ? <CheckCircle2 className="h-4 w-4" /> : step.order}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">{step.skillName}</h4>
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {step.estimatedHours}h
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>

          {step.mentorName && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {step.mentorName.charAt(0)}
              </div>
              <span className="text-muted-foreground">
                with <span className="font-semibold text-foreground">{step.mentorName}</span>
              </span>
            </div>
          )}
        </div>

        {step.completed ? (
          <div className="flex shrink-0 items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold">Done</span>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={completing}
            variant="outline"
            className="h-8 shrink-0 rounded-lg text-xs"
          >
            {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark Done'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
