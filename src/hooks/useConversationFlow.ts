import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationSession {
  sessionId: string;
  conversationType: 'interview' | 'reflection' | 'brainstorming';
  conversationMedium?: 'text' | 'voice';
  messages: ConversationMessage[];
  context?: any;
  goals?: string[];
  isSelfConversation?: boolean;
}

export interface ConversationContext {
  userProfile: any;
  bookProfile: any;
  currentChapter: any;
  recentChapters: any[];
  lifeThemes: string[];
}

export const useConversationFlow = (userId: string, bookId: string, chapterId?: string) => {
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationSession[]>([]);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, [userId, bookId]);

  // Load context when chapter changes
  useEffect(() => {
    if (userId && bookId) {
      loadContext();
    }
  }, [userId, bookId, chapterId]);

  const loadConversationHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading conversation history:', error);
        return;
      }

      const sessions: ConversationSession[] = data.map(chat => {
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
          conversationType: chat.conversation_type as 'interview' | 'reflection' | 'brainstorming',
          conversationMedium: (chat.conversation_medium as 'text' | 'voice') || 'text',
          messages,
          context: chat.context_snapshot,
          goals,
          isSelfConversation: (chat as any).is_self_conversation || false
        };
      });

      setConversationHistory(sessions);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }, [userId]);

  const loadContext = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke(
        'conversation-context-builder',
        {
          body: {
            userId,
            bookId,
            chapterId,
            conversationType: currentSession?.conversationType || 'interview'
          }
        }
      );

      if (error) {
        console.error('Error loading context:', error);
        toast({
          title: "Context Loading Error",
          description: "Failed to load conversation context. Using basic context.",
          variant: "destructive",
        });
        return;
      }

      setContext(data.context);
    } catch (error) {
      console.error('Failed to load context:', error);
      toast({
        title: "Error",
        description: "Failed to prepare conversation context.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, bookId, chapterId, currentSession?.conversationType, toast]);

  const startConversation = useCallback(async (
    conversationType: 'interview' | 'reflection' | 'brainstorming'
  ) => {
    try {
      setIsLoading(true);
      setIsTyping(true);

      const { data, error } = await supabase.functions.invoke(
        'ai-conversation-realtime',
        {
          body: {
            action: 'start_session',
            userId,
            bookId,
            chapterId,
            conversationType,
            context
          }
        }
      );

      if (error) {
        throw error;
      }

      const newSession: ConversationSession = {
        sessionId: data.sessionId,
        conversationType,
        messages: [
          {
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString()
          }
        ],
        context,
        goals: data.goals
      };

      setCurrentSession(newSession);
      
      // Add to history
      setConversationHistory(prev => [newSession, ...prev]);

      toast({
        title: "Conversation Started",
        description: `${conversationType.charAt(0).toUpperCase() + conversationType.slice(1)} conversation is ready!`,
      });

    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [userId, bookId, chapterId, context, toast]);

  const sendMessage = useCallback(async (message: string) => {
    if (!currentSession || !message.trim()) return;

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
      const { data, error } = await supabase.functions.invoke(
        'ai-conversation-realtime',
        {
          body: {
            action: 'send_message',
            sessionId: currentSession.sessionId,
            message,
            userId,
            bookId,
            context,
            conversationType: currentSession.conversationType
          }
        }
      );

      if (error) {
        throw error;
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

      // Update history
      setConversationHistory(prev => 
        prev.map(session => 
          session.sessionId === currentSession.sessionId ? finalSession : session
        )
      );

    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  }, [currentSession, userId, context, toast]);

  const endConversation = useCallback(() => {
    setCurrentSession(null);
    setIsTyping(false);
  }, []);

  const resumeConversation = useCallback((session: ConversationSession) => {
    setCurrentSession(session);
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback((message: string) => {
    if (currentSession) {
      const draftKey = `conversation_draft_${currentSession.sessionId}`;
      localStorage.setItem(draftKey, message);
    }
  }, [currentSession]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    if (currentSession) {
      const draftKey = `conversation_draft_${currentSession.sessionId}`;
      return localStorage.getItem(draftKey) || '';
    }
    return '';
  }, [currentSession]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (currentSession) {
      const draftKey = `conversation_draft_${currentSession.sessionId}`;
      localStorage.removeItem(draftKey);
    }
  }, [currentSession]);

// Integration with WriteBook component - pass these props to ConversationInterface
// Example usage in WriteBook.tsx:
/*
import { ConversationInterface } from '@/components/ConversationInterface';
import { ConversationContext } from '@/components/ConversationContext';

// Add to WriteBook component:
const [showConversation, setShowConversation] = useState(false);

// In the UI, add a button to toggle conversation:
<Button onClick={() => setShowConversation(!showConversation)}>
  Start AI Conversation
</Button>

// Add the conversation components:
{showConversation && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="lg:col-span-2">
      <ConversationInterface
        userId={user?.id}
        bookId={book?.id}
        chapterId={currentChapter?.id}
      />
    </div>
    <div>
      <ConversationContext
        context={conversationContext}
        onRefreshContext={refreshContext}
      />
    </div>
  </div>
)}
*/

  return {
    currentSession,
    conversationHistory,
    context,
    isLoading,
    isTyping,
    startConversation,
    sendMessage,
    endConversation,
    resumeConversation,
    loadContext,
    loadConversationHistory,
    saveDraft,
    loadDraft,
    clearDraft
  };
};