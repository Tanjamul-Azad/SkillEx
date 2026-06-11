import { useState, useCallback, useEffect } from 'react';
import { tutorBotService, type TutorConversationDto, type TutorMessageDto } from '@/services/tutorBotService';
import { useToast } from '@/hooks/use-toast';

interface UseTutorConversationOptions {
  skillId: string;
  onMessageReceived?: (message: TutorMessageDto) => void;
  autoLoad?: boolean;
}

export const useTutorConversation = (options: UseTutorConversationOptions) => {
  const { skillId, onMessageReceived, autoLoad = true } = options;
  const { toast } = useToast();

  const [conversation, setConversation] = useState<TutorConversationDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversation history
  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tutorBotService.getConversation(skillId);
      setConversation(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [skillId, toast]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadConversation();
    }
  }, [autoLoad, loadConversation]);

  // Send a message and get a response
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      try {
        setSending(true);
        setError(null);

        // Send user message
        const response = await tutorBotService.sendMessage(skillId, content);

        // Update local conversation state
        setConversation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, response],
            lastInteractionAt: new Date().toISOString(),
          };
        });

        onMessageReceived?.(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        });
      } finally {
        setSending(false);
      }
    },
    [skillId, onMessageReceived, toast]
  );

  // Submit a quiz answer
  const submitQuizAnswer = useCallback(
    async (messageId: string, answerIndex?: number, answerText?: string) => {
      try {
        setSending(true);
        setError(null);

        const feedback = await tutorBotService.submitQuizAnswer(skillId, messageId, answerIndex, answerText);

        // Update conversation with feedback
        setConversation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, feedback],
            lastInteractionAt: new Date().toISOString(),
          };
        });

        onMessageReceived?.(feedback);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit answer';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        });
      } finally {
        setSending(false);
      }
    },
    [skillId, onMessageReceived, toast]
  );

  // Clear conversation messages
  const clearMessages = useCallback(async () => {
    try {
      setSending(true);
      setError(null);
      await tutorBotService.clearConversation(skillId);

      setConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [],
          lastInteractionAt: new Date().toISOString(),
        };
      });

      toast({
        title: 'Conversation cleared',
        description: 'Your chat history has been cleared.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear conversation';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setSending(false);
    }
  }, [skillId, toast]);

  // Delete conversation
  const deleteConversation = useCallback(async () => {
    try {
      setSending(true);
      setError(null);
      await tutorBotService.deleteConversation(skillId);
      setConversation(null);

      toast({
        title: 'Conversation deleted',
        description: 'Your conversation has been permanently deleted.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setSending(false);
    }
  }, [skillId, toast]);

  return {
    conversation,
    messages: conversation?.messages ?? [],
    loading,
    sending,
    error,
    loadConversation,
    sendMessage,
    submitQuizAnswer,
    clearMessages,
    deleteConversation,
    stats: conversation ? {
      totalQuestions: conversation.totalQuestionsAsked,
      correctAnswers: conversation.questionsAnsweredCorrectly,
      accuracy: conversation.accuracyPercentage,
    } : null,
  };
};
