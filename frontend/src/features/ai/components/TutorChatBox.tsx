import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, GraduationCap, MessageSquare, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TutorMessageDto } from '@/services/tutorBotService';
import { cn } from '@/lib/utils';

interface TutorChatBoxProps {
  messages: TutorMessageDto[];
  loading: boolean;
  sending: boolean;
  onSendMessage: (content: string) => void;
  onQuizAnswer?: (messageId: string, answerIndex: number) => void;
  className?: string;
}

const messageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0 },
};

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
};

export const TutorChatBox: React.FC<TutorChatBoxProps> = ({
  messages,
  loading,
  sending,
  onSendMessage,
  onQuizAnswer,
  className,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState('');

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() && !sending) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      {/* Messages Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center"
            >
              <div className="space-y-4 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">No messages yet</p>
                  <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                    Ask a question, or start with a warm-up to see where you stand.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={sending}
                  onClick={() => onSendMessage('Give me a quick warm-up question to see where I stand.')}
                >
                  Start with a warm-up question
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-4"
              variants={containerVariants}
              animate="animate"
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={messageVariants}
                  className={cn(
                    'flex items-end gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role !== 'user' && (
                    <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-xs rounded-2xl px-4 py-3 lg:max-w-md',
                      msg.role === 'user'
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md border border-border/40 bg-card text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Quiz Options */}
                    {msg.metadata?.isQuiz && msg.metadata?.quizType === 'multiple-choice' && (
                      <div className="mt-3 space-y-2">
                        {msg.metadata?.quizOptions?.map((option, idx) => {
                          const answered = msg.metadata?.answered;
                          const wasPicked = msg.metadata?.userAnswerIndex === idx;
                          const isCorrect = msg.metadata?.correctAnswerIndex === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={answered || sending || !onQuizAnswer}
                              onClick={() => onQuizAnswer?.(msg.id, idx)}
                              className={cn(
                                'flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm transition-colors',
                                !answered &&
                                  'border-border/40 bg-background hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60',
                                answered && isCorrect &&
                                  'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300',
                                answered && wasPicked && !isCorrect &&
                                  'border-destructive/50 bg-destructive/10 text-destructive',
                                answered && !wasPicked && !isCorrect &&
                                  'border-border/40 bg-background opacity-60'
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                                  answered && isCorrect
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : answered && wasPicked
                                      ? 'border-destructive bg-destructive text-destructive-foreground'
                                      : 'border-muted-foreground/40 text-muted-foreground'
                                )}
                              >
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="flex-1 text-foreground">{option}</span>
                              {answered && isCorrect && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                              )}
                              {answered && wasPicked && !isCorrect && (
                                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Suggested Follow-ups */}
                    {msg.metadata?.suggestedFollowUps && msg.metadata.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.metadata.suggestedFollowUps.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={sending}
                            onClick={() => onSendMessage(suggestion)}
                            className="rounded-full border border-border/40 bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    <p
                      className={cn(
                        'mt-2 text-[10px]',
                        msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-end gap-2"
          >
            <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-border/40 bg-card px-4 py-3.5">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-card p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask anything about this skill..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="rounded-xl"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            className="rounded-xl px-4"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Enter to send
        </p>
      </div>
    </div>
  );
};
