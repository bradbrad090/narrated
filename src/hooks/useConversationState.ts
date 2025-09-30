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
  userId: string | null;
  bookId: string | null;
  chapterId?: string | null;
}

export const useConversationState = ({ userId, bookId, chapterId }: UseConversationStateProps) => {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const [deletingSessionIds, setDeletingSessionIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { startTextConversation, sendTextMessage } = useConversationAPI();

  const handleError = useCallback((error: unknown, context: string) => {
    let errorMessage: string;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as any).message);
    } else {
      // Only show generic message if we truly don't know what the error is
      console.warn('Unknown error type in conversation:', error, 'Context:', context);
      errorMessage = 'An unexpected error occurred';
    }
    
    const conversationError = {
      type: 'ai_service' as const,
      message: errorMessage,
      details: { context, originalError: error },
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
    // Clear stale context if chapter has changed
    if (state.context && state.context.currentChapter?.id !== chapterId) {
      dispatch(conversationActions.setContext(null));
      if (state.currentSession) {
        dispatch(conversationActions.setCurrentSession(null));
      }
    }
    
    // Return cached context only if it matches current chapter
    if (state.context && state.context.currentChapter?.id === chapterId) {
      return state.context;
    }

    // Don't load if we don't have valid userId and bookId
    if (!userId || !bookId) {
      dispatch(conversationActions.setLoading(false));
      return null;
    }

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
        userProfile: contextData?.context?.userProfile,
        bookProfile: contextData?.context?.bookProfile,
        currentChapter: contextData?.context?.currentChapter,
        recentChapters: contextData?.context?.recentChapters || [],
        lifeThemes: contextData?.context?.lifeThemes || []
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
    // Don't load if we don't have a valid userId
    if (!userId) {
      dispatch(conversationActions.setLoading(false));
      return;
    }

    try {
      dispatch(conversationActions.setLoading(true));
      
      let query = supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', userId);
      
      // Filter by chapter if chapterId is provided and valid
      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false });

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
          goals: [], // Goals no longer stored in database
          createdAt: record.created_at
        }));

        dispatch(conversationActions.setHistory(sessions));
      }
    } catch (error) {
      handleError(error, 'loading conversation history');
    } finally {
      dispatch(conversationActions.setLoading(false));
    }
  }, [userId, chapterId, handleError]);

  // Start conversation with loading protection
  const startConversation = useCallback(async (
    conversationType: ConversationType,
    conversationMedium: ConversationMedium = 'text'
  ) => {
    if (state.ui.isLoading) {
      console.log('Conversation start blocked - already loading');
      return null;
    }

    console.log('Starting conversation:', { conversationMedium, userId, bookId, chapterId });

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
          conversationType: 'interview',
          context: conversationContext
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) throw error;

      const session: ConversationSession = {
        sessionId: data.sessionId,
        conversationType: 'interview',
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
    if (!state.currentSession || state.ui.isTyping) {
      console.log('Send message blocked:', { hasSession: !!state.currentSession, isTyping: state.ui.isTyping });
      return;
    }
    console.log('Sending message:', { message, sessionId: state.currentSession.sessionId, currentMessages: state.currentSession.messages.length });
    try {
      dispatch(conversationActions.setTyping(true));

      // Create user message
      const userMessage: ConversationMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      // Create updated messages array including the new user message
      const updatedMessages = [...state.currentSession.messages, userMessage];
      const sessionWithUserMessage = {
        ...state.currentSession,
        messages: updatedMessages
      };

      // Update UI with user message
      dispatch(conversationActions.updateSession(sessionWithUserMessage));

      // Send API request with the updated conversation history
      const { data, error } = await supabase.functions.invoke('ai-conversation-realtime', {
        body: {
          action: 'continue_conversation',
          sessionId: state.currentSession.sessionId,
          message, // Keep this for API compatibility, if needed
          userId,
          bookId,
          chapterId,
          context: state.context,
          conversationType: state.currentSession.conversationType,
          conversationHistory: updatedMessages
        }
      });

      console.log('AI response received:', { data, error, sessionId: state.currentSession.sessionId });
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
  }, [state.currentSession, state.ui.isTyping, state.context, userId, bookId, chapterId, handleError]);

  // End current conversation and generate summary
  const endConversation = useCallback(async () => {
    const sessionToEnd = state.currentSession;
    
    // Auto-generate summary if we have a chapterId and just ended a session
    if (chapterId && sessionToEnd && sessionToEnd.messages.length > 0) {
      try {
        console.log('Generating summary from conversation:', { chapterId, messagesCount: sessionToEnd.messages.length });
        
        // Generate summary directly from conversation history
        const { data: generationData, error: generationError } = await supabase.functions.invoke('generate-summary', {
          body: {
            userId,
            bookId,
            chapterId,
            conversationHistory: sessionToEnd.messages
          }
        });

        console.log('Summary generation response:', { generationData, generationError });

        if (generationError) {
          console.error('Summary generation error:', generationError);
          throw generationError;
        }

        if (!generationData?.success) {
          throw new Error(generationData?.error || 'Failed to generate summary');
        }

        // Clear the session after successful summary generation
        dispatch(conversationActions.setCurrentSession(null));

        // Return the generated summary
        if (generationData?.summary) {
          console.log('Summary generated successfully:', generationData.summary);
          return generationData.summary;
        }
      } catch (error) {
        console.error('Failed to generate summary:', error);
        // Clear session even if summary generation fails
        dispatch(conversationActions.setCurrentSession(null));
        toast({
          title: "Summary generation failed",
          description: "Could not generate chapter summary",
          variant: "destructive",
        });
      }
    } else {
      const messagesLength = sessionToEnd?.messages ? sessionToEnd.messages.length : 0;
      console.log('No session to end or generate summary for:', { 
        chapterId, 
        sessionToEnd: !!sessionToEnd, 
        messagesLength,
        hasMessages: !!sessionToEnd?.messages 
      });
      // Clear the session if there's one but no valid data
      dispatch(conversationActions.setCurrentSession(null));
    }
    
    return null;
  }, [chapterId, state.currentSession, userId, bookId, toast]);

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