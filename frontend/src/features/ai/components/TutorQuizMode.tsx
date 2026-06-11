import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TutorMessageDto, TutorMessageMetadata } from '@/services/tutorBotService';
import { cn } from '@/lib/utils';

interface TutorQuizModeProps {
  quizMessage: TutorMessageDto;
  metadata: TutorMessageMetadata;
  onAnswerSelected: (answerIndex: number) => void;
  loading?: boolean;
  className?: string;
}

const optionVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export const TutorQuizMode: React.FC<TutorQuizModeProps> = ({
  quizMessage,
  metadata,
  onAnswerSelected,
  loading = false,
  className,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selectedAnswer === metadata.correctAnswerIndex;

  const handleSelectAnswer = (index: number) => {
    if (!submitted) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer !== null) {
      setSubmitted(true);
      onAnswerSelected(selectedAnswer);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6 rounded-2xl border border-border/40 bg-card p-6', className)}
    >
      {/* Question Header */}
      <div className="space-y-2">
        <Badge variant="secondary">Quiz</Badge>
        <p className="font-semibold leading-relaxed text-foreground">
          {quizMessage.content}
        </p>
      </div>

      {/* Options */}
      {metadata.quizType === 'multiple-choice' && metadata.quizOptions && (
        <div className="space-y-2.5">
          {metadata.quizOptions.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === metadata.correctAnswerIndex;

            return (
              <motion.button
                key={index}
                type="button"
                variants={optionVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: index * 0.04 }}
                onClick={() => handleSelectAnswer(index)}
                disabled={submitted || loading}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  isSelected && !submitted
                    ? 'border-primary bg-primary/5'
                    : 'border-border/40 bg-background',
                  !submitted && !loading && 'hover:border-primary/50',
                  submitted && isCorrectAnswer && 'border-green-500/50 bg-green-500/10',
                  submitted && isSelected && !isCorrectAnswer && 'border-destructive/50 bg-destructive/10',
                  submitted && !isSelected && !isCorrectAnswer && 'opacity-60',
                  submitted && 'cursor-default'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                      isSelected && !submitted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40 text-muted-foreground',
                      submitted && isCorrectAnswer && 'border-green-500 bg-green-500 text-white',
                      submitted && isSelected && !isCorrectAnswer &&
                        'border-destructive bg-destructive text-destructive-foreground'
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>

                  <p className="flex-1 text-sm font-medium text-foreground">{option}</p>

                  {submitted && (
                    <div className="flex-shrink-0">
                      {isCorrectAnswer && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                      {isSelected && !isCorrectAnswer && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Short Answer */}
      {metadata.quizType === 'short-answer' && (
        <input
          type="text"
          placeholder="Type your answer..."
          disabled={submitted || loading}
          className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      )}

      {/* Feedback */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-xl border p-4',
            isCorrect
              ? 'border-green-500/40 bg-green-500/10'
              : 'border-amber-500/40 bg-amber-500/10'
          )}
        >
          <div className="flex gap-3">
            {isCorrect ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <div className="space-y-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isCorrect
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-amber-700 dark:text-amber-300'
                )}
              >
                {isCorrect ? 'Correct' : 'Not quite'}
              </p>
              <p className="text-sm text-muted-foreground">
                {metadata.answerFeedback ||
                  (isCorrect
                    ? 'You nailed this one — keep going.'
                    : 'Review the highlighted answer, then ask the tutor to explain it.')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action */}
      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={selectedAnswer === null || loading}
          className="w-full rounded-xl"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            'Check Answer'
          )}
        </Button>
      )}
    </motion.div>
  );
};
