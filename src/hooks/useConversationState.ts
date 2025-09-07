import { useReducer, useCallback, useEffect, useState } from 'react';
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
import { conversationRepository } from '@/repositories/ConversationRepository';
import { contextCacheService } from '@/services/ContextCacheService';
import { 
  ConversationErrorType, 
  createConversationError, 
  CONVERSATION_CONFIG 
} from '@/config/conversationConfig';
import { useConversationAPI } from './useConversationAPI';

interface UseConversationStateProps {
  userId: string;
  bookId: string;
  chapterId?: string;
}

export const useConversationState = ({ userId, bookId, chapterId }: UseConversationStateProps) => {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const [deletingSessionIds, setDeletingSessionIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { startTextConversation, sendTextMessage, startSelfConversation } = useConversationAPI();

  const handleError = useCallback((error: unknown, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const conversationError = {
      type: 'ai_service' as const,
      message: errorMessage,
      details: { context },
      recoverable: true
    };

    dispatch(conversationActions.setError(conversationError));
    
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  // Load conversation context
  const loadConversationContext = useCallback(async (): Promise<ConversationContext | null> => {
    if (state.context) return state.context;

    try {
      dispatch(conversationActions.setLoading(true));
      
      const context = await contextCacheService.getContext(userId, bookId, chapterId);
      
      if (context) {
        dispatch(conversationActions.setContext(context));
        return context;
      }

      // Build context if not cached
      const { data: contextData, error } = await supabase.functions.invoke('conversation-context-builder', {
        body: { userId, bookId, chapterId }
      });

      if (error) throw error;

      const newContext: ConversationContext = {
        userProfile: contextData?.userProfile,
        bookProfile: contextData?.bookProfile,
        currentChapter: contextData?.currentChapter,
        recentChapters: contextData?.recentChapters || [],
        lifeThemes: contextData?.lifeThemes || []
      };

      dispatch(conversationActions.setContext(newContext));
      // Cache context
      try {
        // Context cached successfully
      } catch (cacheError) {
        console.warn('Failed to cache context:', cacheError);
      }
      
      return newContext;
    } catch (error) {
      handleError(error, 'loading conversation context');
      return null;
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [userId, bookId, chapterId, state.context, handleError]);

  // Load conversation history with cleanup
  const loadConversationHistory = useCallback(async () => {
    try {
      dispatch(conversationActions.setLoading(true));
      
      const { data, error } = await supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Filter out empty conversations and map to sessions
        const validConversations = data.filter(record => {
          const messages = Array.isArray(record.messages) ? record.messages : [];
          return messages.length > 0; // Only keep conversations with messages
        });

        // Clean up empty conversations from database
        const emptyConversations = data.filter(record => {
          const messages = Array.isArray(record.messages) ? record.messages : [];
          return messages.length === 0;
        });

        if (emptyConversations.length > 0) {
          console.log(`Cleaning up ${emptyConversations.length} empty conversations`);
          const { error: deleteError } = await supabase
            .from('chat_histories')
            .delete()
            .in('id', emptyConversations.map(conv => conv.id));
          
          if (deleteError) {
            console.error('Failed to clean up empty conversations:', deleteError);
          } else {
            console.log('Successfully cleaned up empty conversations');
          }
        }

        const sessions = validConversations.map(record => ({
          id: record.id,
          sessionId: record.session_id,
          conversationType: record.conversation_type as ConversationType,
          conversationMedium: record.conversation_medium as ConversationMedium,
          messages: Array.isArray(record.messages) ? record.messages as unknown as ConversationMessage[] : [],
          goals: Array.isArray(record.conversation_goals) ? record.conversation_goals as string[] : [],
          isSelfConversation: record.is_self_conversation || false,
          createdAt: record.created_at
        }));

        dispatch(conversationActions.setHistory(sessions));
      }
    } catch (error) {
      handleError(error, 'loading conversation history');
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [userId, handleError]);

  // Start conversation with loading protection
  const startConversation = useCallback(async (
    conversationType: ConversationType,
    conversationMedium: ConversationMedium = 'text'
  ) => {
    if (state.ui.isLoading) {
      console.log('Conversation start blocked - already loading');
      return null;
    }

    console.log('Starting conversation:', { conversationType, conversationMedium, userId, bookId, chapterId });

    dispatch(conversationActions.setLoading(true));
    dispatch(conversationActions.setError(null));

    try {
      // Load context first if not available
      const conversationContext = await loadConversationContext();
      
      console.log('Context loaded:', conversationContext);
      
      // Call the edge function to start conversation with AI greeting
      const { data, error } = await supabase.functions.invoke('ai-conversation-realtime', {
        body: {
          action: 'start_session',
          userId,
          bookId,
          chapterId,
          conversationType,
          context: conversationContext,
          styleInstructions: 'Be warm, welcoming, and start with an engaging opening question that helps the person begin sharing their story.'
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) throw error;

      const session: ConversationSession = {
        sessionId: data.sessionId,
        conversationType,
        conversationMedium,
        messages: [
          {
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString()
          }
        ],
        context: conversationContext,
        goals: data.goals,
        isSelfConversation: false,
        createdAt: new Date().toISOString()
      };

      dispatch(conversationActions.setCurrentSession(session));
      
      // Refresh conversation history to show the new conversation
      await loadConversationHistory();
      
      return session;
    } catch (error) {
      console.error('Error in startConversation:', error);
      handleError(error, 'starting conversation');
      return null;
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [state.ui.isLoading, userId, bookId, chapterId, loadConversationContext, loadConversationHistory, handleError]);

  // Send message in current conversation
  const sendMessage = useCallback(async (message: string) => {
    if (!state.currentSession || state.ui.isTyping) return;

    try {
      dispatch(conversationActions.setTyping(true));
      
      // Add user message to current session immediately for better UX
      const userMessage: ConversationMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...state.currentSession.messages, userMessage];
      const sessionWithUserMessage = {
        ...state.currentSession,
        messages: updatedMessages
      };
      
      dispatch(conversationActions.updateSession(sessionWithUserMessage));

      // Detect if this is a resumed conversation (has existing messages before the user message we just added)
      const isResumedConversation = state.currentSession.messages.length > 1;
      
      // Get AI response using the edge function
      const { data, error } = await supabase.functions.invoke('ai-conversation-realtime', {
        body: {
          action: isResumedConversation ? 'continue_conversation' : 'send_message',
          sessionId: state.currentSession.sessionId,
          message,
          userId,
          context: state.context,
          conversationType: state.currentSession.conversationType,
          styleInstructions: 'Continue the interview naturally, asking follow-up questions that help the person share more details about their experiences.',
          conversationHistory: isResumedConversation ? state.currentSession.messages.slice(0, -1) : undefined // Exclude the user message we just added
        }
      });

      if (error) throw error;

      // Add AI response
      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      const finalSession = {
        ...sessionWithUserMessage,
        messages: [...updatedMessages, aiMessage]
      };

      dispatch(conversationActions.updateSession(finalSession));
      return finalSession;
    } catch (error) {
      handleError(error, 'sending message');
    } finally {
      dispatch(conversationActions.setTyping(false));
    }
  }, [state.currentSession, state.ui.isTyping, state.context, userId, handleError]);

  // Start self conversation
  const startSelfConversationMode = useCallback(async (message: string) => {
    try {
      dispatch(conversationActions.setLoading(true));
      await startSelfConversation(userId, bookId, chapterId, message);
      await loadConversationHistory();
    } catch (error) {
      handleError(error, 'starting self conversation');
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [userId, bookId, chapterId, startSelfConversation, loadConversationHistory, handleError]);

  // Resume conversation functionality removed - users can only view and delete conversations

  // End current conversation
  const endConversation = useCallback(() => {
    dispatch(conversationActions.setCurrentSession(null));
  }, []);

  // Get draft for session
  const getDraft = useCallback((sessionId: string): string => {
    return state.drafts[sessionId] || '';
  }, [state.drafts]);

  // Set draft for session
  const setDraft = useCallback((sessionId: string, draft: string) => {
    dispatch(conversationActions.setDraft(sessionId, draft));
  }, []);

  // Clear draft for session
  const clearDraft = useCallback((sessionId: string) => {
    dispatch(conversationActions.clearDraft(sessionId));
  }, []);

  // Clear all state
  const resetState = useCallback(() => {
    dispatch(conversationActions.resetState());
  }, []);

  // Load data on mount
  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  // Auto-save drafts
  useEffect(() => {
    if (state.currentSession && Object.keys(state.drafts).length > 0) {
      const timer = setTimeout(() => {
        // Auto-save drafts to localStorage or similar
        localStorage.setItem(`conversation_drafts_${userId}`, JSON.stringify(state.drafts));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [state.drafts, state.currentSession, userId]);

  // Delete conversation
  const deleteConversation = useCallback(async (session: ConversationSession) => {
    // Add to deleting set
    setDeletingSessionIds(prev => new Set(prev).add(session.sessionId));

    try {
      // Delete from database using ID if available, fallback to session_id
      const { error } = await supabase
        .from('chat_histories')
        .delete()
        .eq((session as any).id ? 'id' : 'session_id', (session as any).id || session.sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      // Remove from local state
      dispatch(conversationActions.setHistory(
        state.history.filter(s => s.sessionId !== session.sessionId)
      ));

      // Clear any associated drafts
      const draftKey = `conversation_draft_${session.sessionId}`;
      localStorage.removeItem(draftKey);
      dispatch(conversationActions.clearDraft(session.sessionId));

      // If this was the current session, end it
      if (state.currentSession?.sessionId === session.sessionId) {
        dispatch(conversationActions.setCurrentSession(null));
      }

      toast({
        title: "Conversation Deleted",
        description: "The conversation has been permanently removed.",
      });

    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Remove from deleting set
      setDeletingSessionIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(session.sessionId);
        return newSet;
      });
    }
  }, [userId, state.currentSession, state.history, toast]);

  return {
    // State
    ...state,
    deletingSessionIds,
    
    // Actions
    loadConversationContext,
    loadConversationHistory,
    startConversation,
    sendMessage,
    startSelfConversation: startSelfConversationMode,
    endConversation,
    deleteConversation,
    getDraft,
    setDraft,
    clearDraft,
    resetState,
    
    // Computed values
    hasActiveSession: !!state.currentSession,
    canSendMessage: !!state.currentSession && !state.ui.isLoading && !state.ui.isTyping,
    conversationCount: state.history.length,
    
    // Context
    context: state.context
  };
};