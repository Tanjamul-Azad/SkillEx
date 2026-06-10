import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TutorMessageDto } from '@/services/tutorBotService';
import { cn } from '@/lib/utils';

interface TutorChatBoxProps {
  messages: TutorMessageDto[];
  loading: boolean;
  sending: boolean;
  onSendMessage: (content: string) => void;
  className?: string;
}

const messageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10 },
};

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const TutorChatBox: React.FC<TutorChatBoxProps> = ({
  messages,
  loading,
  sending,
  onSendMessage,
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center"
            >
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">Start learning!</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Ask me anything about this skill, and I'll help you master it.
                </p>
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
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-xs lg:max-w-md px-4 py-3 rounded-lg',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none border border-border'
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>

                    {/* Quiz Options */}
                    {msg.metadata?.isQuiz && msg.metadata?.quizType === 'multiple-choice' && (
                      <div className="mt-3 space-y-2">
                        {msg.metadata?.quizOptions?.map((option, idx) => (
                          <Button
                            key={idx}
                            variant="secondary"
                            size="sm"
                            className="w-full justify-start text-left h-auto"
                            disabled={msg.metadata?.answered}
                          >
                            <span className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="text-sm">{option}</span>
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Suggested Follow-ups */}
                    {msg.metadata?.suggestedFollowUps && msg.metadata.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.metadata.suggestedFollowUps.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-1"
                            onClick={() => onSendMessage(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}

                    <p className="text-xs opacity-70 mt-2">
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
            className="flex gap-3"
          >
            <div className="flex items-end gap-2 bg-muted rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4 space-y-2">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="rounded-lg"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            size="sm"
            className="px-3"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
