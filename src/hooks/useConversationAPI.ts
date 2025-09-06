// Centralized conversation API calls
import { supabase } from '@/integrations/supabase/client';
import { ConversationSession, ConversationMessage, ConversationContext } from '@/types/conversation';
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Extended type for database sessions that include the database ID
interface DatabaseConversationSession extends ConversationSession {
  id: string;
}

export const useConversationAPI = () => {
  const { toast } = useToast();

  const generateConversationSummary = useCallback(async (conversationId: string, userId: string): Promise<string | null> => {
    try {
      console.log('Generating summary for conversation:', conversationId);
      
      const { data, error } = await supabase.functions.invoke('generate-conversation-summary', {
        body: { conversationId, userId }
      });

      if (error) {
        console.error('Failed to generate summary:', error);
        return null;
      }

      return data.summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  }, []);

  const startTextConversation = useCallback(async (
    userId: string,
    bookId: string,
    chapterId?: string,
    conversationType: string = 'interview'
  ): Promise<DatabaseConversationSession> => {
    try {
      const sessionId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: userId,
          chapter_id: chapterId,
          session_id: sessionId,
          conversation_type: conversationType,
          conversation_medium: 'text',
          messages: [],
          context_snapshot: {} as any,
          conversation_goals: getConversationGoals(conversationType) as any
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        sessionId,
        conversationType: conversationType as any,
        conversationMedium: 'text',
        messages: [],
        goals: getConversationGoals(conversationType),
        isSelfConversation: false,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const sendTextMessage = useCallback(async (
    session: ConversationSession,
    message: string,
    userId: string
  ): Promise<ConversationSession> => {
    try {
      const userMessage: ConversationMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...session.messages, userMessage];

      // Get AI response
      const { data, error } = await supabase.functions.invoke('openai-conversation', {
        body: {
          prompt: buildConversationPrompt(updatedMessages, session.conversationType)
        }
      });

      if (error) throw error;

      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: data.generatedText,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, aiMessage];

      // Update database
      await supabase
        .from('chat_histories')
        .update({ messages: finalMessages as any })
        .eq('session_id', session.sessionId)
        .eq('user_id', userId);

      // Generate summary after conversation has meaningful content (3+ messages)
      if (finalMessages.length >= 3) {
        const dbSession = session as DatabaseConversationSession;
        if (dbSession.id) {
          generateConversationSummary(dbSession.id, userId);
        }
      }

      return {
        ...session,
        messages: finalMessages
      };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast, generateConversationSummary]);

  const startSelfConversation = useCallback(async (
    userId: string,
    bookId: string,
    chapterId: string | undefined,
    message: string
  ): Promise<void> => {
    try {
      const sessionId = `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: userId,
          chapter_id: chapterId,
          session_id: sessionId,
          conversation_type: 'self',
          conversation_medium: 'text',
          messages: [{
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
          }] as any,
          context_snapshot: {} as any,
          conversation_goals: ['Document personal thoughts and experiences'] as any,
          is_self_conversation: true
        })
        .select()
        .single();

      if (error) throw error;

      // Generate summary for self-conversations
      generateConversationSummary(data.id, userId);

      toast({
        title: "Success",
        description: "Self conversation saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save self conversation",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast, generateConversationSummary]);

  return {
    startTextConversation,
    sendTextMessage,
    startSelfConversation,
    generateConversationSummary
  };
};

// Helper functions
const getConversationGoals = (type: string): string[] => {
  switch (type) {
    case 'interview':
      return [
        'Gather specific life stories and experiences',
        'Explore key relationships and influences',
        'Document important life events chronologically',
        'Capture personal growth and learning moments'
      ];
    case 'reflection':
      return [
        'Explore deeper meanings and life lessons',
        'Understand personal values and beliefs',
        'Reflect on life changes and transformations',
        'Connect past experiences to current wisdom'
      ];
    case 'brainstorming':
      return [
        'Generate creative story ideas and themes',
        'Identify unique personal experiences',
        'Explore different narrative perspectives',
        'Develop compelling chapter concepts'
      ];
    default:
      return ['Engage in meaningful conversation about life experiences'];
  }
};

const buildConversationPrompt = (
  messages: ConversationMessage[],
  conversationType: string
): string => {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  return `You are a compassionate life coach helping document life stories through interviews.

Type: ${conversationType} - Focus on extracting specific stories and experiences
Last user message: "${lastUserMessage}"

Respond naturally and ask engaging follow-up questions. Keep responses warm and conversational (2-3 sentences). Always end with a question that encourages more storytelling.`;
};