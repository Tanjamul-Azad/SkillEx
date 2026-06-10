import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  skillAssessmentService,
  type SkillAssessment,
  type GradedAssessment,
  type QuizQuestion,
} from '@/services/skillAssessmentService';
import { cn } from '@/lib/utils';

type Page = 'intro' | 'quiz' | 'results';

export default function SkillAssessmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const skillId = searchParams.get('skillId');
  const skillName = searchParams.get('skillName');
  const difficulty = searchParams.get('difficulty') || 'intermediate';

  const [page, setPage] = useState<Page>('intro');
  const [assessment, setAssessment] = useState<SkillAssessment | null>(null);
  const [results, setResults] = useState<GradedAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds

  // Timer
  useEffect(() => {
    if (page !== 'quiz') return;
    const timer = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 0) {
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [page]);

  const handleStartAssessment = async () => {
    if (!skillId) {
      toast({ variant: 'destructive', title: 'Missing skill ID' });
      return;
    }

    setLoading(true);
    try {
      const data = await skillAssessmentService.generate(skillId, difficulty);
      setAssessment(data);
      setPage('quiz');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to generate assessment' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    setLoading(true);
    try {
      const graded = await skillAssessmentService.submit(assessment.assessmentId, answers);
      setResults(graded);
      setPage('results');

      if (graded.passedThreshold) {
        toast({ title: '🎉 Assessment Passed!', description: 'You earned the certificate!' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Assessment Not Passed',
          description: `Score: ${graded.score}%. Try again to reach 70%.`,
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to submit assessment' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <motion.div className="mx-auto max-w-4xl py-8 space-y-8">
        <AnimatePresence mode="wait">
          {page === 'intro' && (
            <IntroPage
              skillName={skillName}
              difficulty={difficulty}
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
              skillName={skillName}
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
  skillName,
  difficulty,
  onStart,
  loading,
}: {
  skillName: string | null;
  difficulty: string;
  onStart: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI Skill Assessment</span>
        </div>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground">
          {skillName || 'Skill'} Assessment
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Take this AI-graded quiz to verify your capability and earn a credible certificate.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: '📋', label: 'Questions', value: '5 questions' },
          { icon: '⏱️', label: 'Time', value: '30 minutes' },
          { icon: '✅', label: 'Pass Score', value: '70% or higher' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border/40 bg-card p-6 text-center">
            <div className="text-3xl mb-2">{item.icon}</div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">{item.label}</p>
            <p className="text-lg font-bold text-foreground mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* What to Expect */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 space-y-4">
        <h2 className="font-headline text-lg font-extrabold text-foreground">What to expect:</h2>
        <ul className="space-y-3">
          {[
            'Mix of multiple-choice and free-text questions',
            'Questions test real-world application, not just definitions',
            'AI grades your answers using semantic understanding',
            'If you pass, you unlock a verified certificate',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onStart}
          disabled={loading}
          className="rounded-xl px-8"
        >
          {loading ? 'Generating Assessment...' : 'Start Assessment'}
          <ArrowRight className="ml-2 h-4 w-4" />
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
  const answered = Object.keys(answers).length;
  const total = assessment.questions.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
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
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Clock className="h-4 w-4" />
          {timeRemaining}
        </div>
      </div>

      {/* Questions */}
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

      {/* Submit */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={loading || answered < total}
          className="rounded-xl px-8"
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
          <ArrowRight className="ml-2 h-4 w-4" />
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border/40 bg-card p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary text-sm">
          {index}
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <p className="font-semibold text-foreground text-lg">{question.question}</p>

          {question.type === 'multiple_choice' && question.options && (
            <RadioGroup value={answer} onValueChange={onAnswer}>
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <RadioGroupItem value={option} id={`${question.questionId}-${option}`} />
                    <span className="text-sm font-medium text-muted-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          )}

          {question.type === 'free_text' && (
            <Textarea
              placeholder="Your answer..."
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              className="min-h-24 resize-none rounded-lg"
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-8"
    >
      {/* Result Card */}
      <motion.div
        className={cn(
          'rounded-2xl border-2 p-8 md:p-12 text-center space-y-6',
          isPassed
            ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 via-card to-card'
            : 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-card to-card'
        )}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {isPassed ? (
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
          ) : (
            <AlertCircle className="mx-auto h-16 w-16 text-amber-600" />
          )}
        </motion.div>

        <div>
          <h2 className="font-headline text-3xl font-extrabold text-foreground">
            {isPassed ? '🎉 Assessment Passed!' : 'Almost There!'}
          </h2>
          <p className="text-lg text-muted-foreground mt-2">
            {isPassed
              ? `You've successfully verified your ${skillName} capabilities!`
              : 'You can try again to improve your score.'}
          </p>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Score',
              value: `${results.score}%`,
              color: isPassed ? 'text-green-600' : 'text-amber-600',
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
            <div key={item.label} className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">{item.label}</p>
              <p className={cn('text-2xl font-bold mt-2', item.color || 'text-foreground')}>
                {item.capitalize ? results.proficiencyLevel.toUpperCase() : item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-left">
          <p className="text-sm font-medium text-foreground mb-2">Feedback:</p>
          <p className="text-sm text-muted-foreground">{results.feedback}</p>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        {!isPassed && (
          <Button onClick={onRestart} variant="outline" size="lg" className="rounded-xl">
            Try Again
          </Button>
        )}
        {isPassed && (
          <Button asChild size="lg" className="rounded-xl">
            <a href="/certificates">View Certificate</a>
          </Button>
        )}
        <Button asChild variant="outline" size="lg" className="rounded-xl">
          <a href="/dashboard">Back to Dashboard</a>
        </Button>
      </div>
    </motion.div>
  );
}
