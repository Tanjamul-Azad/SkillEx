import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Lightbulb, Users, Clock, Target } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { skillGapService, type SkillGapAnalysis, type PathStep, type MentorMatch } from '@/services/skillGapService';
import { SkillService } from '@/services/skillService';
import type { Skill } from '@/types';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type Step = 'select' | 'analyzing' | 'results';

export default function SkillGapAnalyzerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('select');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedGoalSkill, setSelectedGoalSkill] = useState<Skill | null>(null);
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    SkillService.getAll()
      .then(setSkills)
      .catch(() => toast({ variant: 'destructive', title: 'Failed to load skills' }));
  }, []);

  const handleAnalyze = async () => {
    if (!selectedGoalSkill) return;

    setStep('analyzing');
    setLoading(true);

    try {
      const result = await skillGapService.analyze(selectedGoalSkill.id);
      setAnalysis(result);
      setStep('results');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: 'Could not analyze skill gap. Try again.',
      });
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <span className="text-sm font-semibold text-primary">AI Skill Gap Analyzer</span>
          </div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground mt-4">
            What skills are you missing?
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Pick a skill you want to master. We'll analyze what you need to learn and connect you with mentors for each step.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Skill Search */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">Goal Skill</label>
                <Input
                  placeholder="Search for a skill (e.g., React, Machine Learning, Public Speaking)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredSkills.map((skill) => (
                  <motion.button
                    key={skill.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedGoalSkill(skill)}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-all',
                      selectedGoalSkill?.id === skill.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/40 bg-card hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{skill.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{skill.name}</p>
                        <p className="text-xs text-muted-foreground">{skill.category}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Action */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedGoalSkill || loading}
                  size="lg"
                  className="flex-1 rounded-xl"
                >
                  {loading ? 'Analyzing...' : 'Analyze My Path'}
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
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="h-8 w-8 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Analyzing your learning path...</p>
                <p className="text-sm text-muted-foreground mt-2">Finding the best mentors for each step</p>
              </div>
            </motion.div>
          )}

          {step === 'results' && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Summary Card */}
              <motion.div
                variants={itemVariants}
                className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/15 p-3">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-headline text-2xl font-extrabold text-foreground">
                      {analysis.goalSkillName}
                    </h2>
                    <p className="mt-2 text-muted-foreground">{analysis.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {analysis.recommendedPath.estimatedHours}h total
                      </Badge>
                      <Badge variant="secondary">
                        <Target className="h-3 w-3 mr-1" />
                        {analysis.gaps.length} skills to learn
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Learning Path Steps */}
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="font-headline text-lg font-extrabold text-foreground flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Your Learning Path
                </h3>

                <div className="space-y-3">
                  {analysis.recommendedPath.steps.map((step, idx) => (
                    <PathStepCard key={step.skillId} step={step} index={idx} />
                  ))}
                </div>
              </motion.div>

              {/* Gaps Card */}
              {analysis.gaps.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="font-headline text-lg font-extrabold text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Missing Skills ({analysis.gaps.length})
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    {analysis.gaps.map((gap) => (
                      <motion.div
                        key={gap.skillId}
                        whileHover={{ scale: 1.02 }}
                        className="rounded-xl border border-border/40 bg-card p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-amber-500/10 p-2">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{gap.skillName}</p>
                            <p className="text-xs text-muted-foreground mt-1">{gap.whyMissing}</p>
                            {gap.availableMentorNames.length > 0 && (
                              <p className="text-xs text-primary mt-2">
                                {gap.mentorCount} mentor{gap.mentorCount !== 1 ? 's' : ''} available
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Action */}
              <motion.div variants={itemVariants} className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setStep('select');
                    setSelectedGoalSkill(null);
                    setSearchQuery('');
                  }}
                  className="flex-1 rounded-xl"
                >
                  Analyze Another Skill
                </Button>
                <Button size="lg" className="flex-1 rounded-xl">
                  Start Learning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}

function PathStepCard({ step, index }: { step: PathStep; index: number }) {
  const [showMentors, setShowMentors] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl border border-border/40 bg-card p-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
          {step.order}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{step.skillName}</p>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {step.estimatedHours}h
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{step.rationale}</p>

          {step.availableMentors.length > 0 && (
            <motion.div
              initial={false}
              animate={{ height: showMentors ? 'auto' : 0, opacity: showMentors ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-3 space-y-2"
            >
              {step.availableMentors.map((mentor) => (
                <div key={mentor.mentorId} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-xs">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                    {mentor.mentorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{mentor.mentorName}</p>
                    <p className="text-muted-foreground">{mentor.sessionsCompleted} sessions, {mentor.avgRating.toFixed(1)}★</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                    Request
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
              className="mt-2 h-7 text-xs"
            >
              {showMentors ? 'Hide' : 'Show'} {step.availableMentors.length} Mentor{step.availableMentors.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
