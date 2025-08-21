// Consolidated conversation state management hook using reducer pattern

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

      const { data, error } = await supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(CONVERSATION_CONFIG.CONVERSATION_HISTORY_LIMIT);

      if (error) {
        throw error;
      }

      const sessions: ConversationSession[] = (data as any[]).map(chat => {
        // Parse messages with type safety
        let messages: ConversationMessage[] = [];
        if (Array.isArray(chat.messages)) {
          messages = (chat.messages as unknown[]).filter((msg: any) => 
            msg && 
            typeof msg === 'object' && 
            typeof msg.role === 'string' && 
            typeof msg.content === 'string' &&
            typeof msg.timestamp === 'string'
          ) as ConversationMessage[];
        }

        // Parse goals with type safety
        let goals: string[] = [];
        if (Array.isArray(chat.conversation_goals)) {
          goals = (chat.conversation_goals as unknown[]).filter((goal: any) => 
            typeof goal === 'string'
          ) as string[];
        }

        return {
          sessionId: chat.session_id,
          conversationType: chat.conversation_type as ConversationType,
          conversationMedium: chat.conversation_medium as ConversationMedium,
          messages,
          context: chat.context_snapshot,
          goals,
          isSelfConversation: chat.is_self_conversation || false,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at
        };
      });

      dispatch(conversationActions.setHistory(sessions));
    } catch (error) {
      handleError(error, 'loading conversation history');
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [userId, handleError]);

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
    if (!state.context) {
      handleError(new Error('Context not loaded'), 'starting conversation');
      return;
    }

    const params = {
      userId,
      bookId,
      chapterId,
      conversationType,
      context: state.context,
      styleInstructions
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

  useEffect(() => {
    if (userId && bookId) {
      loadContext();
    }
  }, [loadContext]);

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