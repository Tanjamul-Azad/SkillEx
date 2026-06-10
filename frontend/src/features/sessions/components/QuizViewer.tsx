import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, RotateCw } from 'lucide-react';
import type { QuizQuestion } from '@/services/flashcardService';

interface QuizViewerProps {
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
}

export default function QuizViewer({ questions, onComplete }: QuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const userAnsweredCorrectly = selectedAnswerIndex === currentQuestion.correctAnswerIndex;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-emerald-100 text-emerald-700';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700';
      case 'HARD': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (selectedAnswerIndex === null) {
      setSelectedAnswerIndex(index);
      setAnswers({
        ...answers,
        [currentQuestion.id]: index,
      });
      setShowExplanation(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswerIndex(null);
      setShowExplanation(false);
    } else {
      // Calculate final score
      const correct = Object.keys(answers).filter(
        (id) => {
          const question = questions.find((q) => q.id === id);
          return question && answers[id] === question.correctAnswerIndex;
        }
      ).length;
      const score = Math.round((correct / questions.length) * 100);
      onComplete?.(score);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevQuestion = questions[currentIndex - 1];
      setSelectedAnswerIndex(answers[prevQuestion.id] ?? null);
      setShowExplanation(selectedAnswerIndex !== null);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswerIndex(null);
    setAnswers({});
    setShowExplanation(false);
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <p className="text-slate-500 text-center">
          No quiz questions available for this session.
        </p>
      </div>
    );
  }

  const correctCount = Object.keys(answers).filter(
    (id) => {
      const question = questions.find((q) => q.id === id);
      return question && answers[id] === question.correctAnswerIndex;
    }
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Quiz</h3>
          <p className="text-sm text-slate-500">
            Question {currentIndex + 1} of {questions.length}
            {Object.keys(answers).length > 0 && ` • ${correctCount} correct`}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
        >
          <RotateCw size={16} />
          Reset
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${currentQuestion.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Question Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Answer Choices */}
          <div className="space-y-3">
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = selectedAnswerIndex === index;
              const isCorrect = index === currentQuestion.correctAnswerIndex;
              const showFeedback = selectedAnswerIndex !== null;

              let buttonClass = 'border-2 border-slate-200 bg-white hover:border-slate-300 ';
              if (showFeedback) {
                if (isCorrect) {
                  buttonClass = 'border-2 border-emerald-500 bg-emerald-50 cursor-default ';
                } else if (isSelected && !isCorrect) {
                  buttonClass = 'border-2 border-red-500 bg-red-50 cursor-default ';
                } else {
                  buttonClass = 'border-2 border-slate-200 bg-slate-50 cursor-default opacity-60 ';
                }
              }

              return (
                <motion.button
                  key={`choice-${index}`}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={selectedAnswerIndex !== null}
                  className={`w-full p-4 rounded-lg text-left font-medium transition-all ${buttonClass}`}
                  whileHover={selectedAnswerIndex === null ? { scale: 1.02 } : {}}
                  whileTap={selectedAnswerIndex === null ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {showFeedback && isCorrect && (
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <XCircle size={20} className="text-red-600" />
                      )}
                      {!showFeedback && (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      )}
                      {showFeedback && !isSelected && !isCorrect && (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <span className="text-slate-900">{choice}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-lg border-l-4 ${
                  userAnsweredCorrectly
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                    : 'bg-blue-50 border-blue-500 text-blue-900'
                }`}
              >
                <div className="flex gap-2">
                  {userAnsweredCorrectly ? (
                    <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600">ℹ</div>
                  )}
                  <div>
                    <p className="font-semibold mb-1">
                      {userAnsweredCorrectly ? 'Correct!' : 'Explanation'}
                    </p>
                    <p className="text-sm">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0 || selectedAnswerIndex === null}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>

        <div className="text-center">
          {selectedAnswerIndex !== null && (
            <motion.span
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className={`text-sm font-semibold ${
                userAnsweredCorrectly ? 'text-emerald-600' : 'text-blue-600'
              }`}
            >
              {userAnsweredCorrectly ? '✓ Correct' : '✓ Answer recorded'}
            </motion.span>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={selectedAnswerIndex === null}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-white font-medium"
        >
          {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
