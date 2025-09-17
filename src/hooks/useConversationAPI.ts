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

  const startTextConversation = useCallback(async (
    userId: string,
    bookId: string,
    chapterId?: string
  ): Promise<DatabaseConversationSession> => {
    try {
      const sessionId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: userId,
          chapter_id: chapterId,
          session_id: sessionId,
          conversation_type: 'interview',
          conversation_medium: 'text',
          messages: [],
          context_snapshot: {} as any,
          conversation_goals: getConversationGoals() as any
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        sessionId,
        conversationType: 'interview' as any,
        conversationMedium: 'text',
        messages: [],
        goals: getConversationGoals(),
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
          prompt: buildConversationPrompt(updatedMessages)
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
  }, [toast]);

  return {
    startTextConversation,
    sendTextMessage
  };
};

// Helper functions
const getConversationGoals = (): string[] => {
  return [
    'Gather specific life stories and experiences',
    'Explore key relationships and influences', 
    'Document important life events chronologically',
    'Capture personal growth and learning moments'
  ];
};

const buildConversationPrompt = (
  messages: ConversationMessage[]
): string => {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  return `You are a compassionate life coach helping document life stories through interviews.

Focus on extracting specific stories and experiences
Last user message: "${lastUserMessage}"

Respond naturally and ask engaging follow-up questions. Keep responses warm and conversational (2-3 sentences). Always end with a question that encourages more storytelling.`;
};