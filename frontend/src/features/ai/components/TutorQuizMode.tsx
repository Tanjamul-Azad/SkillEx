import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
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
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
  selected: { scale: 0.98 },
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6 p-6 rounded-xl border border-border bg-card', className)}
    >
      {/* Question Header */}
      <div className="space-y-2">
        <Badge variant="secondary">Quiz Question</Badge>
        <p className="text-lg font-semibold leading-relaxed text-foreground">
          {quizMessage.content}
        </p>
      </div>

      {/* Options */}
      {metadata.quizType === 'multiple-choice' && metadata.quizOptions && (
        <div className="space-y-3">
          {metadata.quizOptions.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const showResult = submitted && isSelected;
            const isCorrectAnswer = index === metadata.correctAnswerIndex;

            return (
              <motion.button
                key={index}
                variants={optionVariants}
                initial="initial"
                animate="animate"
                whileHover={submitted ? undefined : 'hover'}
                whileTap={submitted ? undefined : 'selected'}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelectAnswer(index)}
                disabled={submitted || loading}
                className={cn(
                  'w-full p-4 rounded-lg border-2 text-left transition-all',
                  isSelected && !submitted
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/50',
                  submitted && isCorrectAnswer && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                  submitted && isSelected && !isCorrectAnswer && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                  submitted && 'cursor-default'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 flex-shrink-0 font-semibold',
                    isSelected && !submitted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground text-muted-foreground',
                    submitted && isCorrectAnswer && 'border-green-500 bg-green-500 text-white',
                    submitted && isSelected && !isCorrectAnswer && 'border-red-500 bg-red-500 text-white'
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium">{option}</p>
                  </div>

                  {submitted && (
                    <div className="flex-shrink-0">
                      {isCorrectAnswer && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {isSelected && !isCorrectAnswer && (
                        <XCircle className="h-5 w-5 text-red-500" />
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
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Type your answer..."
            disabled={submitted || loading}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Feedback */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'p-4 rounded-lg',
            isCorrect
              ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
          )}
        >
          <div className="flex gap-3">
            {isCorrect ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ArrowRight className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className={cn(
                'font-semibold',
                isCorrect ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
              )}>
                {isCorrect ? 'Excellent work!' : 'Not quite right'}
              </p>
              <p className={cn(
                'text-sm',
                isCorrect ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              )}>
                {metadata.answerFeedback || (isCorrect ? 'Great job mastering this concept!' : 'Review and try again.')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={selectedAnswer === null || loading}
          className="w-full"
          size="lg"
        >
          Check Answer
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          size="lg"
        >
          Next Question
        </Button>
      )}
    </motion.div>
  );
};
