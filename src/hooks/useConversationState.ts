import { useReducer, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ConversationState, 
  ConversationType, 
  ConversationMedium, 
  ConversationSession,
  ConversationContext,
  ConversationMessage,
  ChatHistoryRecord
} from '@/types/conversation';
import { 
  conversationReducer, 
  initialConversationState, 
  conversationActions 
} from '@/state/conversationReducer';
import { conversationMediator } from '@/mediators/ConversationMediator';
import { conversationRepository } from '@/repositories/ConversationRepository';
import { contextCacheService } from '@/services/ContextCacheService';
import { 
  ConversationErrorType, 
  createConversationError, 
  CONVERSATION_CONFIG 
} from '@/config/conversationConfig';

interface UseConversationStateProps {
  userId: string;
  bookId: string;
  chapterId?: string;
}

export const useConversationState = ({ 
  userId, 
  bookId, 
  chapterId 
}: UseConversationStateProps) => {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const { toast } = useToast();

  // Error handler with user-friendly messages
  const handleError = useCallback((error: any, context: string) => {
    const conversationError = createConversationError(
      ConversationErrorType.NETWORK,
      `${context}: ${error.message || 'Unknown error occurred'}`,
      true,
      error
    );

    dispatch(conversationActions.setError(conversationError));
    
    toast({
      title: "Error",
      description: conversationError.message,
      variant: "destructive",
    });

    console.error(`Conversation error in ${context}:`, conversationError);
  }, [toast]);

  // Load conversation history
  const loadConversationHistory = useCallback(async () => {
    try {
      dispatch(conversationActions.setLoading(true));

      const result = await conversationRepository.getUserConversations(userId, chapterId);
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      const sessions = result.data.map(record => conversationRepository.mapToConversationSession(record));
      dispatch(conversationActions.setHistory(sessions));
    } catch (error) {
      handleError(error, 'loading conversation history');
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [userId, chapterId, handleError]);

  // Load conversation context
  const loadContext = useCallback(async () => {
    try {
      dispatch(conversationActions.setLoading(true));
      
      const { data, error } = await supabase.functions.invoke(
        'conversation-context-builder',
        {
          body: {
            userId,
            bookId,
            chapterId,
            conversationType: state.currentSession?.conversationType || 'interview'
          }
        }
      );

      if (error) {
        throw error;
      }

      dispatch(conversationActions.setContext(data.context));
    } catch (error) {
      handleError(error, 'loading conversation context');
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [userId, bookId, chapterId, state.currentSession?.conversationType, handleError]);

  // Start a new conversation
  const startConversation = useCallback(async (
    medium: ConversationMedium,
    conversationType: ConversationType,
    styleInstructions?: string
  ) => {
    let context = state.context;
    
    // Load context if not already loaded
    if (!context) {
      try {
        dispatch(conversationActions.setLoading(true));
        
        const { data, error } = await supabase.functions.invoke(
          'conversation-context-builder',
          {
            body: {
              userId,
              bookId,
              chapterId,
              conversationType
            }
          }
        );

        if (error) {
          throw error;
        }

        context = data.context;
        dispatch(conversationActions.setContext(context));
      } catch (error) {
        handleError(error, 'loading conversation context');
        return;
      } finally {
        dispatch(conversationActions.setLoading(false));
      }
    }

    // Extract past opening questions to avoid duplicates
    const pastOpenings = state.history
      .filter(session => session.conversationType === conversationType && session.messages.length > 0)
      .map(session => session.messages.find(msg => msg.role === 'assistant')?.content)
      .filter(Boolean)
      .slice(-8); // Keep last 8 to avoid repetition

    let enhancedStyleInstructions = styleInstructions || '';
    if (pastOpenings.length > 0) {
      enhancedStyleInstructions += `\n\nBegin with a fresh, open-ended question about a different aspect of their life. Do not repeat or closely paraphrase any of these past openings: ${pastOpenings.map(q => `"${q}"`).join(', ')}.`;
    }

    const params = {
      userId,
      bookId,
      chapterId,
      conversationType,
      context: context,
      styleInstructions: enhancedStyleInstructions
    };

    const validation = conversationMediator.validateStartParams(params);
    if (!validation.isValid) {
      handleError(new Error(validation.errors.join(', ')), 'validating start parameters');
      return;
    }

    try {
      dispatch(conversationActions.setLoading(true));
      dispatch(conversationActions.setTyping(true));

      const session = await conversationMediator.startConversation(medium, params);
      
      dispatch(conversationActions.setCurrentSession(session));
      dispatch(conversationActions.addToHistory(session));

      toast({
        title: CONVERSATION_CONFIG.MESSAGES.CONVERSATION_STARTED,
        description: `${conversationType.charAt(0).toUpperCase() + conversationType.slice(1)} conversation is ready!`,
      });

      return session;
    } catch (error) {
      handleError(error, 'starting conversation');
    } finally {
      dispatch(conversationActions.setLoading(false));
      dispatch(conversationActions.setTyping(false));
    }
  }, [state.context, userId, bookId, chapterId, handleError, toast]);

  // Send message in current conversation
  const sendMessage = useCallback(async (message: string) => {
    if (!state.currentSession) {
      handleError(new Error('No active conversation'), 'sending message');
      return;
    }

    if (!state.context) {
      handleError(new Error('Context not available'), 'sending message');
      return;
    }

    const params = {
      session: state.currentSession,
      message,
      userId,
      context: state.context
    };

    const validation = conversationMediator.validateSendParams(params);
    if (!validation.isValid) {
      handleError(new Error(validation.errors.join(', ')), 'validating message parameters');
      return;
    }

    try {
      dispatch(conversationActions.setTyping(true));

      const updatedSession = await conversationMediator.sendMessage(state.currentSession, params);
      
      dispatch(conversationActions.updateSession(updatedSession));
      return updatedSession;
    } catch (error) {
      handleError(error, 'sending message');
    } finally {
      dispatch(conversationActions.setTyping(false));
    }
  }, [state.currentSession, state.context, userId, handleError]);

  // End current conversation
  const endConversation = useCallback(async () => {
    if (state.currentSession) {
      try {
        await conversationMediator.endConversation(state.currentSession.sessionId);
      } catch (error) {
        console.error('Error ending conversation:', error);
      }
    }
    dispatch(conversationActions.setCurrentSession(null));
    dispatch(conversationActions.setTyping(false));
  }, [state.currentSession]);

  // Resume existing conversation
  const resumeConversation = useCallback(async (session: ConversationSession) => {
    try {
      await conversationMediator.resumeConversation(session);
      dispatch(conversationActions.setCurrentSession(session));
    } catch (error) {
      handleError(error, 'resuming conversation');
    }
  }, [handleError]);

  // Draft management
  const saveDraft = useCallback((message: string) => {
    if (state.currentSession) {
      dispatch(conversationActions.setDraft(state.currentSession.sessionId, message));
    }
  }, [state.currentSession]);

  const loadDraft = useCallback((sessionId?: string): string => {
    const targetSessionId = sessionId || state.currentSession?.sessionId;
    return targetSessionId ? state.drafts[targetSessionId] || '' : '';
  }, [state.currentSession, state.drafts]);

  const clearDraft = useCallback((sessionId?: string) => {
    const targetSessionId = sessionId || state.currentSession?.sessionId;
    if (targetSessionId) {
      dispatch(conversationActions.clearDraft(targetSessionId));
    }
  }, [state.currentSession]);

  // UI state management
  const setSpeaking = useCallback((speaking: boolean) => {
    dispatch(conversationActions.setSpeaking(speaking));
  }, []);

  const setConnecting = useCallback((connecting: boolean) => {
    dispatch(conversationActions.setConnecting(connecting));
  }, []);

  const clearError = useCallback(() => {
    dispatch(conversationActions.setError(null));
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  // Remove automatic context loading - load only when needed

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      conversationMediator.cleanup();
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startConversation,
    sendMessage,
    endConversation,
    resumeConversation,
    loadConversationHistory,
    loadContext,
    
    // Draft management
    saveDraft,
    loadDraft,
    clearDraft,
    
    // UI actions
    setSpeaking,
    setConnecting,
    clearError,
    
    // Utilities
    getAvailableTypes: conversationMediator.getAvailableTypes.bind(conversationMediator),
    getConversationGoals: conversationMediator.getConversationGoals.bind(conversationMediator),
    isMediumSupported: conversationMediator.isMediumSupported.bind(conversationMediator)
  };
};