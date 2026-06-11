import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, CheckSquare, HelpCircle, AlertCircle, Loader } from 'lucide-react';
import AppBackButton from '@/components/navigation/AppBackButton';
import FlashcardViewer from '../components/FlashcardViewer';
import QuizViewer from '../components/QuizViewer';
import ActionItemsList from '../components/ActionItemsList';
import { FlashcardService, type StudyMaterial } from '@/services/flashcardService';

type TabType = 'flashcards' | 'quiz' | 'actions';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export default function SessionStudyMaterialsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('flashcards');
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const tabs: TabConfig[] = [
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: <BookOpen size={18} />,
      description: 'Learn key concepts with interactive flashcards',
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: <HelpCircle size={18} />,
      description: 'Test your knowledge with practice questions',
    },
    {
      id: 'actions',
      label: 'Action Items',
      icon: <CheckSquare size={18} />,
      description: 'Track next steps and follow-up tasks',
    },
  ];

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID not provided');
      setLoading(false);
      return;
    }

    const fetchStudyMaterials = async () => {
      try {
        setLoading(true);
        setError(null);
        const materials = await FlashcardService.getStudyMaterials(sessionId);
        setStudyMaterial(materials);
      } catch (err) {
        console.error('Failed to load study materials:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load study materials. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudyMaterials();
  }, [sessionId]);

  const handleQuizComplete = (score: number) => {
    setQuizScore(score);
    // Could show a modal or redirect here
    console.log(`Quiz completed with score: ${score}%`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
          <p className="text-slate-600 font-medium">
            Generating study materials from session notes...
          </p>
          <p className="text-sm text-slate-500">
            This may take a moment as we extract flashcards, quiz questions, and action items.
          </p>
        </div>
      </div>
    );
  }

  if (error || !studyMaterial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <AppBackButton />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-8 rounded-xl border-2 border-red-200 bg-red-50 text-center"
          >
            <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
            <h2 className="text-2xl font-bold text-red-900 mb-2">
              Unable to Generate Study Materials
            </h2>
            <p className="text-red-700 mb-6">
              {error || 'The study materials could not be loaded. This might happen if:'}
            </p>
            <ul className="text-left text-red-700 space-y-2 mb-6 max-w-md mx-auto">
              <li>- The session has not yet been completed</li>
              <li>- Session notes haven't been generated yet</li>
              <li>- The AI service is temporarily unavailable</li>
              <li>- The session ID is invalid</li>
            </ul>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-white font-medium"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentTab = tabs.find((t) => t.id === activeTab)!;
  const hasFlashcards = studyMaterial.flashcards.length > 0;
  const hasQuizzes = studyMaterial.quizQuestions.length > 0;
  const hasActionItems = studyMaterial.actionItems.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <AppBackButton />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Study Materials
              </h1>
              <p className="text-slate-600 mt-1">
                {studyMaterial.skillName || 'Session'} — Interactive learning resources
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              let hasContent = true;
              if (tab.id === 'flashcards') hasContent = hasFlashcards;
              if (tab.id === 'quiz') hasContent = hasQuizzes;
              if (tab.id === 'actions') hasContent = hasActionItems;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!hasContent}
                  className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : hasContent
                      ? 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  whileHover={hasContent && !isActive ? { scale: 1.05 } : {}}
                  whileTap={hasContent && !isActive ? { scale: 0.95 } : {}}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {!hasContent && <span className="text-xs">(empty)</span>}
                </motion.button>
              );
            })}
          </div>

          {/* Tab Description */}
          <p className="text-sm text-slate-600">{currentTab.description}</p>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'flashcards' && (
                <div>
                  {hasFlashcards ? (
                    <FlashcardViewer flashcards={studyMaterial.flashcards} />
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 text-lg">
                        No flashcards were extracted from this session.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div>
                  {hasQuizzes ? (
                    <div>
                      {quizScore !== null && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mb-6 p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200"
                        >
                          <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-slate-600">Last Quiz Score</p>
                            <p className="text-5xl font-bold text-indigo-600">{quizScore}%</p>
                            <p className="text-slate-600">
                              {quizScore >= 80
                                ? 'Excellent work! You have a strong grasp of the material.'
                                : quizScore >= 60
                                ? 'Good effort! Review the material and try again to improve.'
                                : 'Keep practicing! Review the concepts and try again.'}
                            </p>
                          </div>
                        </motion.div>
                      )}
                      <QuizViewer
                        questions={studyMaterial.quizQuestions}
                        onComplete={handleQuizComplete}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 text-lg">
                        No quiz questions were extracted from this session.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'actions' && (
                <div>
                  {hasActionItems ? (
                    <ActionItemsList items={studyMaterial.actionItems} />
                  ) : (
                    <div className="text-center py-12">
                      <CheckSquare size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 text-lg">
                        No action items were extracted from this session.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        {(hasFlashcards || hasQuizzes || hasActionItems) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {hasFlashcards && (
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-indigo-600" />
                  <div>
                    <p className="text-sm text-slate-600">Flashcards</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {studyMaterial.flashcards.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {hasQuizzes && (
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-3">
                  <HelpCircle size={20} className="text-purple-600" />
                  <div>
                    <p className="text-sm text-slate-600">Questions</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {studyMaterial.quizQuestions.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {hasActionItems && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckSquare size={20} className="text-emerald-600" />
                  <div>
                    <p className="text-sm text-slate-600">Action Items</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {studyMaterial.actionItems.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
