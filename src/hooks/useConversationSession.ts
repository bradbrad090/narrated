import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ConversationType, 
  ConversationError, 
  ConversationErrorType, 
  createConversationError,
  CONVERSATION_CONFIG 
} from '@/config/conversationConfig';
import { ConversationMessage, ConversationSession } from '@/hooks/useConversationFlow';

interface UseConversationSessionProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  context?: any;
}

export const useConversationSession = ({ 
  userId, 
  bookId, 
  chapterId, 
  context 
}: UseConversationSessionProps) => {
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const handleError = useCallback((error: ConversationError) => {
    console.error(`Conversation ${error.type} error:`, error);
    
    const errorMessages = {
      [ConversationErrorType.NETWORK]: "Network connection failed. Please check your internet connection.",
      [ConversationErrorType.AI_SERVICE]: "AI service is temporarily unavailable. Please try again.",
      [ConversationErrorType.VALIDATION]: "Invalid input. Please check your data and try again.",
      [ConversationErrorType.PERMISSION]: "Permission denied. Please check your access rights.",
      [ConversationErrorType.TIMEOUT]: "Request timed out. Please try again."
    };

    toast({
      title: "Error",
      description: errorMessages[error.type] || error.message,
      variant: "destructive",
    });
  }, [toast]);

  const startConversation = useCallback(async (
    conversationType: ConversationType,
    styleInstructions?: string
  ) => {
    if (!userId || !bookId) {
      const error = createConversationError(
        ConversationErrorType.VALIDATION,
        "User ID and Book ID are required",
        false
      );
      handleError(error);
      return;
    }

    try {
      setIsLoading(true);
      setIsTyping(true);

      const { data, error: supabaseError } = await supabase.functions.invoke(
        'ai-conversation-realtime',
        {
          body: {
            action: 'start_session',
            userId,
            bookId,
            chapterId,
            conversationType,
            context,
            styleInstructions
          }
        }
      );

      if (supabaseError) {
        throw createConversationError(
          ConversationErrorType.AI_SERVICE,
          "Failed to start conversation session",
          true,
          supabaseError
        );
      }

      const newSession: ConversationSession = {
        sessionId: data.sessionId,
        conversationType,
        conversationMedium: 'text',
        messages: [
          {
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString()
          }
        ],
        context,
        goals: data.goals,
        styleInstructions
      };

      setCurrentSession(newSession);
      
      toast({
        title: CONVERSATION_CONFIG.MESSAGES.CONVERSATION_STARTED,
        description: `${conversationType.charAt(0).toUpperCase() + conversationType.slice(1)} conversation is ready!`,
      });

      return newSession;

    } catch (error) {
      const isConversationError = (err: any): err is ConversationError => {
        return err && typeof err === 'object' && 'type' in err && 'message' in err && 'recoverable' in err;
      };

      if (isConversationError(error)) {
        handleError(error);
      } else {
        handleError(createConversationError(
          ConversationErrorType.NETWORK,
          "Failed to start conversation. Please try again.",
          true,
          error as Error
        ));
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [userId, bookId, chapterId, context, toast, handleError]);

  const sendMessage = useCallback(async (message: string) => {
    if (!currentSession || !message.trim()) {
      const error = createConversationError(
        ConversationErrorType.VALIDATION,
        "No active session or empty message",
        false
      );
      handleError(error);
      return;
    }

    try {
      setIsTyping(true);

      // Add user message to current session immediately
      const userMessage: ConversationMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage]
      };
      setCurrentSession(updatedSession);

      // Send to AI
      const { data, error: supabaseError } = await supabase.functions.invoke(
        'ai-conversation-realtime',
        {
          body: {
            action: 'send_message',
            sessionId: currentSession.sessionId,
            message,
            userId,
            bookId,
            context,
            conversationType: currentSession.conversationType,
            styleInstructions: currentSession.styleInstructions
          }
        }
      );

      if (supabaseError) {
        throw createConversationError(
          ConversationErrorType.AI_SERVICE,
          "Failed to send message",
          true,
          supabaseError
        );
      }

      // Add AI response
      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, aiMessage]
      };

      setCurrentSession(finalSession);
      return finalSession;

    } catch (error) {
      const isConversationError = (err: any): err is ConversationError => {
        return err && typeof err === 'object' && 'type' in err && 'message' in err && 'recoverable' in err;
      };

      if (isConversationError(error)) {
        handleError(error);
      } else {
        handleError(createConversationError(
          ConversationErrorType.NETWORK,
          CONVERSATION_CONFIG.MESSAGES.MESSAGE_FAILED,
          true,
          error as Error
        ));
      }
    } finally {
      setIsTyping(false);
    }
  }, [currentSession, userId, bookId, context, handleError]);

  const endConversation = useCallback(() => {
    setCurrentSession(null);
    setIsTyping(false);
  }, []);

  const resumeConversation = useCallback((session: ConversationSession) => {
    setCurrentSession(session);
  }, []);

  return {
    currentSession,
    isLoading,
    isTyping,
    startConversation,
    sendMessage,
    endConversation,
    resumeConversation,
    handleError
  };
};