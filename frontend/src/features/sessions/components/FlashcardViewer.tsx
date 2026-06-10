import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw, Volume2 } from 'lucide-react';
import type { Flashcard } from '@/services/flashcardService';

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onComplete?: () => void;
}

export default function FlashcardViewer({ flashcards, onComplete }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  const isMastered = masteredCards.has(currentCard.id);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-emerald-100 text-emerald-700';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700';
      case 'HARD': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleToggleMastered = () => {
    const newMastered = new Set(masteredCards);
    if (newMastered.has(currentCard.id)) {
      newMastered.delete(currentCard.id);
    } else {
      newMastered.add(currentCard.id);
    }
    setMasteredCards(newMastered);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCards(new Set());
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <p className="text-slate-500 text-center">
          No flashcards available for this session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Flashcards</h3>
          <p className="text-sm text-slate-500">
            Card {currentIndex + 1} of {flashcards.length}
            {masteredCards.size > 0 && ` • ${masteredCards.size} mastered`}
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
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="h-80 perspective">
        <AnimatePresence mode="wait">
          <motion.div
            key={`card-${currentCard.id}`}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-full"
          >
            <div className="relative w-full h-full cursor-pointer [perspective:1000px]">
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-2 border-indigo-200 p-8 flex flex-col justify-between"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(currentCard.difficulty)}`}>
                        {currentCard.difficulty}
                      </span>
                      <span className="text-xs text-slate-500">Front</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 break-words">
                      {currentCard.term}
                    </h2>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">Click to reveal definition</p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeak(currentCard.term);
                        }}
                        className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 transition-colors"
                        title="Pronounce term"
                      >
                        <Volume2 size={18} className="text-slate-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200 p-8 flex flex-col justify-between"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-xs font-semibold text-emerald-700">Definition</span>
                    </div>
                    <p className="text-xl text-slate-900 leading-relaxed break-words">
                      {currentCard.definition}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">Click to hide definition</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeak(currentCard.definition);
                      }}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 transition-colors inline-block"
                      title="Pronounce definition"
                    >
                      <Volume2 size={18} className="text-slate-700" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-700" />
        </button>

        <button
          onClick={handleToggleMastered}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            isMastered
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-150'
          }`}
        >
          {isMastered ? '✓ Mastered' : 'Mark as Mastered'}
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={20} className="text-slate-700" />
        </button>
      </div>

      {/* Completion message */}
      <AnimatePresence>
        {currentIndex === flashcards.length - 1 && masteredCards.size === flashcards.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center"
          >
            <p className="text-emerald-700 font-semibold">
              Excellent! You've mastered all flashcards.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
