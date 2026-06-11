import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Target,
  Loader2,
  SearchX,
  RefreshCw,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BrainCircuit,
  Film,
  Music,
  Code,
  Camera,
  Mic,
  Database,
  Paintbrush,
  PenTool,
  Laptop,
  Disc,
  Box,
  Megaphone,
  Languages,
  ChefHat,
  Palette,
  Table,
  AppWindow,
  BookOpen,
  Globe,
  Lightbulb,
  Figma,
  Zap,
  CalendarDays,
  Video,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { skillGapService, type SkillGapAnalysis, type PathStep } from '@/services/skillGapService';
import { SkillService } from '@/services/skillService';
import { learningPathService } from '@/services/learningPathService';
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

const SKILL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AppWindow,
  BookOpen,
  Box,
  CalendarDays,
  Camera,
  ChefHat,
  Code,
  Database,
  Disc,
  Figma,
  Film,
  Globe,
  Languages,
  Laptop,
  Lightbulb,
  Megaphone,
  Mic,
  Music,
  Paintbrush,
  Palette,
  PenTool,
  Table,
  Target,
  Video,
  Zap,
};

type Step = 'select' | 'analyzing' | 'results';

export default function SkillGapAnalyzerPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState(false);
  const [selectedGoalSkill, setSelectedGoalSkill] = useState<Skill | null>(null);
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingPath, setCreatingPath] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customGoalSkillName, setCustomGoalSkillName] = useState<string | null>(null);

  const loadSkills = useCallback(() => {
    setSkillsLoading(true);
    setSkillsError(false);
    SkillService.getAll()
      .then(setSkills)
      .catch(() => setSkillsError(true))
      .finally(() => setSkillsLoading(false));
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleAnalyze = async () => {
    const customGoal = customGoalSkillName?.trim();
    if (!selectedGoalSkill && !customGoal) return;

    setStep('analyzing');
    setLoading(true);

    try {
      const result = selectedGoalSkill
        ? await skillGapService.analyze(selectedGoalSkill.id)
        : await skillGapService.analyzeCustom(customGoal as string);
      setAnalysis(result);
      setStep('results');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: 'Could not analyze that skill right now. Try again.',
      });
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLearning = async () => {
    const goalSkillId = analysis?.goalSkillId ?? selectedGoalSkill?.id;
    if (!goalSkillId || creatingPath) {
      toast({
        title: 'Skill is waiting for catalog approval',
        description: 'You can review the AI plan now. A bookable learning path needs an approved catalog skill.',
      });
      return;
    }
    setCreatingPath(true);
    try {
      await learningPathService.generate(goalSkillId);
      toast({
        title: 'Learning path created',
        description: 'Mentors are matched for every step. Track it from Learning Paths.',
      });
      navigate('/ai/learning-paths');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not create the path',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setCreatingPath(false);
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSkills = skills.filter((skill) => {
    if (!normalizedSearch) return true;
    return [skill.name, skill.category, skill.description]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });
  const hasExactMatch = normalizedSearch.length > 0
    && skills.some((skill) => skill.name.toLowerCase() === normalizedSearch);
  const canAnalyzeCustom = normalizedSearch.length >= 2 && !hasExactMatch;

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mx-auto max-w-5xl space-y-8 py-8"
      >
        <motion.div variants={itemVariants} className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI generated from your skills, the catalog, and available mentors
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-foreground">
            Skill Gap Analyzer
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Pick a skill you want to reach. We compare it against what you already know,
            then map the gap step by step with a mentor for each one.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">Goal skill</label>
                <Input
                  placeholder="Search skills, React, Machine Learning, Public Speaking..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCustomGoalSkillName(null);
                  }}
                  className="h-11 rounded-xl"
                />
              </div>

              {skillsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} variant="custom" className="h-[74px] rounded-xl" />
                  ))}
                </div>
              ) : skillsError ? (
                <div className="rounded-2xl border border-border/40 bg-card p-10 text-center">
                  <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 font-semibold text-foreground">Couldn't load the skill catalog</p>
                  <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
                  <Button variant="outline" className="mt-4 rounded-xl" onClick={loadSkills}>
                    Retry
                  </Button>
                </div>
              ) : filteredSkills.length === 0 && !canAnalyzeCustom ? (
                <div className="rounded-2xl border border-border/40 bg-card p-10 text-center">
                  <SearchX className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 font-semibold text-foreground">No skills match "{searchQuery}"</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try a shorter or broader term.</p>
                  <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </div>
              ) : (
                <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto pr-1">
                  {canAnalyzeCustom && (
                    <motion.button
                      type="button"
                      onClick={() => {
                        setSelectedGoalSkill(null);
                        setCustomGoalSkillName(searchQuery.trim());
                      }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-colors',
                        customGoalSkillName === searchQuery.trim()
                          ? 'border-primary bg-primary/10'
                          : 'border-primary/30 bg-primary/5 hover:border-primary/60'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            Analyze "{searchQuery.trim()}"
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Custom goal. It will be queued for catalog review.
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  )}
                  {filteredSkills.map((skill) => (
                    <motion.button
                      key={skill.id}
                      type="button"
                      onClick={() => {
                        setSelectedGoalSkill(skill);
                        setCustomGoalSkillName(null);
                      }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-colors',
                        selectedGoalSkill?.id === skill.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border/40 bg-card hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <SkillIcon icon={skill.icon} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{skill.name}</p>
                          <p className="text-xs text-muted-foreground">{skill.category}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleAnalyze}
                  disabled={(!selectedGoalSkill && !customGoalSkillName) || loading}
                  size="lg"
                  className="rounded-xl px-8"
                >
                  {selectedGoalSkill
                    ? `Analyze ${selectedGoalSkill.name}`
                    : customGoalSkillName
                      ? `Analyze ${customGoalSkillName}`
                      : 'Analyze'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-border/40 bg-card py-20"
            >
              <div className="relative flex h-16 w-16 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-2xl border border-primary/25"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-2 rounded-xl border border-primary/40"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <BrainCircuit className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  Mapping your gap to {selectedGoalSkill?.name ?? customGoalSkillName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ordering the steps and matching mentors. This can take a few seconds.
                </p>
              </div>
            </motion.div>
          )}

          {step === 'results' && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-8"
            >
              <div className="rounded-2xl border border-border/40 bg-card p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-headline text-2xl font-extrabold text-foreground">
                      {analysis.goalSkillName}
                    </h2>
                    <p className="mt-2 text-muted-foreground">{analysis.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        <Sparkles className="mr-1 h-3 w-3" />
                        AI generated
                      </Badge>
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        {analysis.recommendedPath.estimatedHours}h total
                      </Badge>
                      <Badge variant="secondary">
                        <ListChecks className="mr-1 h-3 w-3" />
                        {analysis.gaps.length} skill{analysis.gaps.length !== 1 ? 's' : ''} to close
                      </Badge>
                      {!analysis.goalSkillId && (
                        <Badge variant="outline" className="border-amber-400/50 text-amber-600 dark:text-amber-300">
                          Pending catalog review
                        </Badge>
                      )}
                    </div>
                    {!analysis.goalSkillId && (
                      <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
                        This goal is not in the approved catalog yet. The AI plan is usable now, but mentor-backed learning path booking unlocks after approval.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-headline text-lg font-extrabold text-foreground">
                    Recommended order
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Each step builds on the one before it.
                  </p>
                </div>

                <div className="space-y-3">
                  {analysis.recommendedPath.steps.map((step, idx) => (
                    <PathStepCard key={`${step.order}-${step.skillName}`} step={step} index={idx} />
                  ))}
                </div>
              </div>

              {analysis.gaps.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-headline text-lg font-extrabold text-foreground">
                      What's missing
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Why each skill made it onto your path.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {analysis.gaps.map((gap) => (
                      <div
                        key={gap.skillName}
                        className="rounded-2xl border border-border/40 bg-card p-4"
                      >
                        <p className="font-semibold text-foreground">{gap.skillName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{gap.whyMissing}</p>
                        {gap.availableMentorNames.length > 0 && (
                          <p className="mt-2 text-xs font-medium text-primary">
                            {gap.mentorCount} mentor{gap.mentorCount !== 1 ? 's' : ''} available
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-border/40 pt-6 sm:flex-row">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setStep('select');
                    setSelectedGoalSkill(null);
                    setCustomGoalSkillName(null);
                    setSearchQuery('');
                  }}
                  className="flex-1 rounded-xl"
                >
                  Analyze Another Skill
                </Button>
                <Button
                  size="lg"
                  className="flex-1 rounded-xl"
                  disabled={creatingPath}
                  onClick={handleStartLearning}
                >
                  {creatingPath ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Building your path...
                    </>
                  ) : (
                    <>
                      {analysis.goalSkillId ? 'Start Learning' : 'Waiting for Approval'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}

function SkillIcon({ icon }: { icon?: string | null }) {
  const Icon = icon ? SKILL_ICON_MAP[icon] : undefined;
  const Fallback = Icon ?? Lightbulb;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
      <Fallback className="h-5 w-5" />
    </span>
  );
}

function PathStepCard({ step, index }: { step: PathStep; index: number }) {
  const [showMentors, setShowMentors] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-border/40 bg-card p-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {step.order}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{step.skillName}</p>
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {step.estimatedHours}h
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{step.rationale}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Outcome', value: step.learningOutcome, Icon: Target },
              { label: 'Practice', value: step.practiceTask, Icon: ListChecks },
              { label: 'Proof', value: step.completionProof, Icon: BookOpen },
              { label: 'Next', value: step.nextStepDependency, Icon: ArrowRight },
            ]
              .filter((item) => item.value?.trim())
              .map(({ label, value, Icon }) => (
                <div key={label} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/85">{value}</p>
                </div>
              ))}
          </div>

          {(step.suggestedSessionTitle || step.platformAction) && (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              {step.suggestedSessionTitle && (
                <p className="font-semibold text-foreground">{step.suggestedSessionTitle}</p>
              )}
              {step.platformAction && (
                <p className="mt-1 text-muted-foreground">{step.platformAction}</p>
              )}
            </div>
          )}

          {step.availableMentors.length > 0 && (
            <motion.div
              initial={false}
              animate={{ height: showMentors ? 'auto' : 0, opacity: showMentors ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              {step.availableMentors.map((mentor) => (
                <div
                  key={mentor.mentorId}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 p-2 text-xs"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {mentor.mentorName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{mentor.mentorName}</p>
                    <p className="text-muted-foreground">
                      {mentor.sessionsCompleted} sessions / {mentor.avgRating.toFixed(1)} rating
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => navigate(`/profile/${mentor.mentorId}`)}
                  >
                    View Profile
                  </Button>
                </div>
              ))}
            </motion.div>
          )}

          {step.availableMentors.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMentors(!showMentors)}
              className="mt-2 h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showMentors ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {step.availableMentors.length} mentor{step.availableMentors.length !== 1 ? 's' : ''} for this step
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
