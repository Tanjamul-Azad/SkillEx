import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SessionService } from '@/services/sessionService';
import { ReviewService } from '@/services/reviewService';
import { useAuth } from '@/hooks/useAuth';
import type { Session } from '@/types';
import { Star, Sparkles, CheckCircle2, ArrowRight, BookOpen, Clock, RefreshCw } from 'lucide-react';

export default function SessionReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);
  const [aiNotes, setAiNotes] = useState<{
    sessionId: string;
    keyConcepts: string;
    actionItems: string;
    resourcesMentioned: string;
    summary: string;
    generatedAt: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    SessionService.getById(sessionId)
      .then(setSessionInfo)
      .catch(() => {});

    let pollAttempts = 0;
    const maxPolls = 20; // Up to 80 seconds of polling
    let intervalId: any;

    const checkNotes = async () => {
      try {
        const notes = await SessionService.getNotes(sessionId);
        if (notes && notes.summary && notes.summary.trim()) {
          setAiNotes(notes);
          if (intervalId) clearInterval(intervalId);
          return true;
        }
      } catch (err) {
        console.warn('Note fetch failed or notes not ready yet', err);
      }
      return false;
    };

    // First attempt immediately
    checkNotes().then((done) => {
      if (done) return;

      intervalId = setInterval(async () => {
        pollAttempts++;
        const donePoll = await checkNotes();
        if (donePoll || pollAttempts >= maxPolls) {
          clearInterval(intervalId);
        }
      }, 4000);
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!sessionId || !sessionInfo || !user?.id) {
        throw new Error('Session details are still loading.');
      }

      const toUser = sessionInfo.teacher?.id === user.id ? sessionInfo.learner : sessionInfo.teacher;
      if (!toUser?.id || !sessionInfo.skill?.id) {
        throw new Error('Could not resolve review recipient.');
      }

      await ReviewService.create({
        sessionId,
        toUserId: toUser.id,
        skillId: sessionInfo.skill.id,
        rating,
        comment: comment.trim() || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      alert(err instanceof Error ? err.message : 'Could not submit review.');
    }
  };

  const skillName = sessionInfo?.skill?.name || 'Skill Exchange';

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left Side: Confetti/Congrats Card (Width 2/5) */}
        <div className="md:col-span-2 bg-[#1B263B]/40 rounded-3xl p-6 border border-white/5 flex flex-col justify-between text-center backdrop-blur-md relative overflow-hidden shadow-2xl">
          {/* Subtle cyan glow orb */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#00C9C8]/10 rounded-full blur-2xl" />
          
          <div className="my-auto space-y-4">
            <div className="inline-flex p-3 bg-[#00C9C8]/10 text-[#00C9C8] rounded-2xl border border-[#00C9C8]/20 animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-[#00C9C8] bg-clip-text text-transparent">
                Swap Completed!
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                You successfully completed your skill-exchange block on **{skillName}**!
              </p>
            </div>

            <div className="flex justify-center items-center gap-6 py-2">
              <div className="text-center">
                <span className="block text-xs text-slate-500">Duration</span>
                <span className="text-sm font-semibold flex items-center gap-1 mt-0.5 justify-center">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  60 Mins
                </span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <span className="block text-xs text-slate-500">Topic</span>
                <span className="text-sm font-semibold flex items-center gap-1 mt-0.5 justify-center">
                  <BookOpen className="h-3.5 w-3.5 text-[#00C9C8]" />
                  {skillName.substring(0, 15)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rate your experience</h3>
            
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex justify-center items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((index) => {
                  const active = hoverRating !== null ? index <= hoverRating : index <= rating;
                  return (
                    <button
                      key={index}
                      type="button"
                      onMouseEnter={() => setHoverRating(index)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(index)}
                      className="p-1 transition-transform transform active:scale-95 hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          active ? 'fill-[#00C9C8] text-[#00C9C8]' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-[#1B263B]/20 border border-white/5 rounded-2xl p-3 text-xs leading-relaxed text-slate-200 focus:outline-none focus:border-[#00C9C8]/40 resize-none h-24 shadow-inner"
                placeholder="Leave private review feedback for your swap partner..."
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#00C9C8]/80 to-[#009291]/80 hover:from-[#00C9C8] hover:to-[#009291] text-white py-3 rounded-xl text-xs font-bold transition duration-300 flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Read-Only AI recap (Width 3/5) */}
        <div className="md:col-span-3 bg-[#1B263B]/20 rounded-3xl p-6 border border-white/5 flex flex-col overflow-hidden max-h-[600px]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4.5 w-4.5 text-[#00C9C8] animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Your AI Session Summary</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 text-slate-300 text-xs leading-relaxed">
            {aiNotes ? (
              <div className="space-y-4">
                <div className="bg-[#1B263B]/40 p-4 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-[#00C9C8] mb-1">Executive Summary</h4>
                  <p className="whitespace-pre-wrap">{aiNotes.summary}</p>
                </div>

                <div className="bg-[#1B263B]/40 p-4 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-[#00C9C8] mb-1">Concepts Learned</h4>
                  <p className="whitespace-pre-wrap">{aiNotes.keyConcepts}</p>
                </div>

                <div className="bg-[#1B263B]/40 p-4 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-[#00C9C8] mb-1">Action Items</h4>
                  <p className="whitespace-pre-wrap">{aiNotes.actionItems}</p>
                </div>

                {aiNotes.resourcesMentioned && (
                  <div className="bg-[#1B263B]/40 p-4 rounded-2xl border border-white/5">
                    <h4 className="font-bold text-[#00C9C8] mb-1">Resources & Links</h4>
                    <p className="whitespace-pre-wrap">{aiNotes.resourcesMentioned}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-2 text-slate-500">
                <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
                <p>Generating final AI notes summary...</p>
                <p className="text-[10px] text-slate-600">Please wait. Local Gemma is synthesizing your call transcript.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
