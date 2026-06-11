import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ListChecks,
  Award,
  SearchX,
  Loader2,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  skillAssessmentService,
  type SkillAssessment,
  type GradedAssessment,
  type QuizQuestion,
} from '@/services/skillAssessmentService';
import { SkillService } from '@/services/skillService';
import type { Skill } from '@/types';
import { cn } from '@/lib/utils';

type Page = 'intro' | 'quiz' | 'results';

export default function SkillAssessmentPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const paramSkillId = searchParams.get('skillId');
  const paramSkillName = searchParams.get('skillName');
  const difficulty = searchParams.get('difficulty') || 'intermediate';

  const [skillId, setSkillId] = useState<string | null>(paramSkillId);
  const [skillName, setSkillName] = useState<string | null>(paramSkillName);
  const [page, setPage] = useState<Page>('intro');
  const [assessment, setAssessment] = useState<SkillAssessment | null>(null);
  const [results, setResults] = useState<GradedAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds

  // Keep the latest submit handler in a ref so the countdown can auto-submit
  // with the answers as they are at that moment, not as they were at mount.
  const submitRef = useRef<() => void>(() => {});

  // Timer — decrements only; auto-submit fires from the effect below.
  useEffect(() => {
    if (page !== 'quiz') return;
    const timer = setInterval(() => {
      setTimeRemaining((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [page]);

  useEffect(() => {
    if (page === 'quiz' && timeRemaining === 0) {
      toast({ title: "Time's up", description: 'Submitting your answers now.' });
      submitRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, page]);

  const handleStartAssessment = async () => {
    if (!skillId) {
      toast({ variant: 'destructive', title: 'Pick a skill to assess first' });
      return;
    }

    setLoading(true);
    try {
      const data = await skillAssessmentService.generate(skillId, difficulty);
      setAssessment(data);
      setSkillName(data.skillName || skillName);
      setAnswers({});
      setTimeRemaining(30 * 60);
      setPage('quiz');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not create the quiz',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!assessment || loading) return;

    setLoading(true);
    try {
      const graded = await skillAssessmentService.submit(assessment.assessmentId, answers);
      setResults(graded);
      setPage('results');

      if (graded.passedThreshold) {
        toast({ title: 'Assessment passed', description: 'Your certificate is in your collection.' });
      } else {
        toast({
          title: 'Not quite there',
          description: `You scored ${graded.score}%. You need 70% — try again whenever you're ready.`,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not submit',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };
  submitRef.current = handleSubmit;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <motion.div className="mx-auto max-w-5xl space-y-8 py-8">
        <AnimatePresence mode="wait">
          {page === 'intro' && (
            <IntroPage
              skillId={skillId}
              skillName={skillName}
              difficulty={difficulty}
              onPickSkill={(skill) => {
                setSkillId(skill.id);
                setSkillName(skill.name);
              }}
              onStart={handleStartAssessment}
              loading={loading}
            />
          )}

          {page === 'quiz' && assessment && (
            <QuizPage
              assessment={assessment}
              answers={answers}
              onAnswerChange={(qId, answer) =>
                setAnswers((prev) => ({ ...prev, [qId]: answer }))
              }
              timeRemaining={formatTime(timeRemaining)}
              onSubmit={handleSubmit}
              loading={loading}
            />
          )}

          {page === 'results' && results && (
            <ResultsPage
              results={results}
              skillName={results.skillName || skillName}
              onRestart={() => {
                setPage('intro');
                setAnswers({});
                setTimeRemaining(30 * 60);
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}

function IntroPage({
  skillId,
  skillName,
  difficulty,
  onPickSkill,
  onStart,
  loading,
}: {
  skillId: string | null;
  skillName: string | null;
  difficulty: string;
  onPickSkill: (skill: Skill) => void;
  onStart: () => void;
  loading: boolean;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (skillId) return;
    SkillService.getAll().then(setSkills).catch(() => setSkills([]));
  }, [skillId]);

  const filtered = skills.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >
      <div className="space-y-1.5">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground">
          {skillName ? `${skillName} Assessment` : 'Skill Assessment'}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A short, timed quiz that verifies what you know. Pass it and the certificate is yours.
        </p>
      </div>

      {/* Skill picker — shown when arriving without a preselected skill */}
      {!skillId && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            Which skill are you verifying?
          </label>
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl"
          />
          {skills.length > 0 && filtered.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
              <SearchX className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No skills match "{search}" — try a broader term.
              </p>
            </div>
          ) : (
            <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3">
              {filtered.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => onPickSkill(skill)}
                  className="rounded-xl border border-border/40 bg-card p-4 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start gap-3">
                    {skill.icon && <span className="text-xl leading-none">{skill.icon}</span>}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">{skill.category}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Format at a glance */}
      <div className="grid divide-y divide-border/40 rounded-2xl border border-border/40 bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { icon: ListChecks, label: 'Format', value: '5 questions' },
          { icon: Clock, label: 'Time limit', value: '30 minutes' },
          { icon: Award, label: 'To pass', value: '70% or higher' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="font-bold text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-6">
        <h2 className="font-headline text-base font-extrabold text-foreground">
          Before you start
        </h2>
        <ul className="mt-3 space-y-2.5">
          {[
            `Expect a mix of multiple-choice and written questions at ${difficulty} level.`,
            'Questions focus on applying the skill, not reciting definitions.',
            'Written answers are graded automatically — explain your reasoning in your own words.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onStart}
          disabled={loading || !skillId}
          className="rounded-xl px-8"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing your quiz...
            </>
          ) : (
            <>
              Start Assessment
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function QuizPage({
  assessment,
  answers,
  onAnswerChange,
  timeRemaining,
  onSubmit,
  loading,
}: {
  assessment: SkillAssessment;
  answers: Record<string, string>;
  onAnswerChange: (qId: string, answer: string) => void;
  timeRemaining: string;
  onSubmit: () => void;
  loading: boolean;
}) {
  const answered = Object.values(answers).filter((a) => a.trim().length > 0).length;
  const total = assessment.questions.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-2xl border border-border/40 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-foreground">
            {answered} / {total} answered
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${(answered / total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold tabular-nums text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {timeRemaining}
        </div>
      </div>

      <div className="space-y-6">
        {assessment.questions.map((q, idx) => (
          <QuestionCard
            key={q.questionId}
            question={q}
            index={idx + 1}
            answer={answers[q.questionId] || ''}
            onAnswer={(ans) => onAnswerChange(q.questionId, ans)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-6">
        <p className="text-sm text-muted-foreground">
          {answered < total
            ? `${total - answered} question${total - answered !== 1 ? 's' : ''} left`
            : 'All questions answered.'}
        </p>
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={loading || answered < total}
          className="rounded-xl px-8"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Grading...
            </>
          ) : (
            <>
              Submit Assessment
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function QuestionCard({
  question,
  index,
  answer,
  onAnswer,
}: {
  question: QuizQuestion;
  index: number;
  answer: string;
  onAnswer: (answer: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl border border-border/40 bg-card p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {index}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <p className="font-semibold text-foreground">{question.question}</p>

          {question.type === 'multiple_choice' && question.options && (
            <RadioGroup value={answer} onValueChange={onAnswer}>
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                      answer === option
                        ? 'border-primary bg-primary/5'
                        : 'border-border/40 hover:bg-muted/30'
                    )}
                  >
                    <RadioGroupItem value={option} id={`${question.questionId}-${option}`} />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        answer === option ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          )}

          {question.type === 'free_text' && (
            <Textarea
              placeholder="Write your answer in your own words..."
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              className="min-h-24 resize-none rounded-xl"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ResultsPage({
  results,
  skillName,
  onRestart,
}: {
  results: GradedAssessment;
  skillName: string | null;
  onRestart: () => void;
}) {
  const isPassed = results.passedThreshold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >
      <div
        className={cn(
          'space-y-6 rounded-2xl border bg-card p-8 text-center md:p-12',
          isPassed ? 'border-green-500/40' : 'border-amber-500/40'
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {isPassed ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="mx-auto h-14 w-14 text-amber-600 dark:text-amber-400" />
          )}
        </motion.div>

        <div>
          <h2 className="font-headline text-3xl font-extrabold text-foreground">
            {isPassed ? 'Assessment Passed' : 'Almost There'}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {isPassed
              ? `Your ${skillName ?? 'skill'} proficiency is now verified.`
              : 'No penalty for retaking — review the feedback below and try again.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Score',
              value: `${results.score}%`,
              color: isPassed
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400',
            },
            {
              label: 'Correct',
              value: `${results.questionsCorrect}/${results.questionsTotal}`,
            },
            {
              label: 'Level',
              value: results.proficiencyLevel,
              capitalize: true,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/40 bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p
                className={cn(
                  'mt-2 text-2xl font-bold',
                  item.color || 'text-foreground',
                  item.capitalize && 'capitalize'
                )}
              >
                {item.capitalize ? results.proficiencyLevel.toLowerCase() : item.value}
              </p>
            </div>
          ))}
        </div>

        {results.feedback && (
          <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-left">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Grader feedback
            </p>
            <p className="text-sm text-muted-foreground">{results.feedback}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {!isPassed && (
          <Button onClick={onRestart} size="lg" className="rounded-xl">
            Try Again
          </Button>
        )}
        {isPassed && (
          <Button asChild size="lg" className="rounded-xl">
            <Link to="/certificates">View Certificate</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg" className="rounded-xl">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </motion.div>
  );
}
