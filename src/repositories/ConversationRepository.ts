// Repository for conversation-related database operations

import { BaseRepository, RepositoryResult, RepositoryListResult } from './BaseRepository';
import { ChatHistoryRecord, ConversationSession, ConversationType, ConversationMedium } from '@/types/conversation';
import { supabase } from '@/integrations/supabase/client';

export class ConversationRepository extends BaseRepository {

  async saveSession(
    userId: string,
    session: ConversationSession,
    chapterId?: string
  ): Promise<RepositoryResult<ChatHistoryRecord>> {
    return this.executeTransaction(async () => {
      const record = {
        user_id: userId,
        chapter_id: chapterId,
        session_id: session.sessionId,
        conversation_type: session.conversationType,
        conversation_medium: session.conversationMedium,
        is_self_conversation: false,
        messages: session.messages as any,
        context_snapshot: session.context as any || {},
        conversation_goals: session.goals as any || [],
      };

      const { data, error } = await supabase
        .from('chat_histories')
        .insert(record as any)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save session: ${error.message}`);
      }
      return data as ChatHistoryRecord;
    });
  }

  async updateSession(session: ConversationSession): Promise<RepositoryResult<ChatHistoryRecord>> {
    return this.executeTransaction(async () => {
      const { data, error } = await supabase
        .from('chat_histories')
        .update({
          messages: session.messages as any,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', session.sessionId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update session:', error);
        throw new Error(`Failed to update session: ${error.message}`);
      }
      
      return data as ChatHistoryRecord;
    });
  }

  async getSessionById(sessionId: string): Promise<RepositoryResult<ChatHistoryRecord>> {
    const { data, error } = await supabase
      .from('chat_histories')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      return { data: null, error: this.handleError(error) };
    }

    return { data: data as ChatHistoryRecord, error: null };
  }

  async getUserConversations(
    userId: string,
    chapterId?: string,
    conversationType?: ConversationType,
    conversationMedium?: ConversationMedium
  ): Promise<RepositoryListResult<ChatHistoryRecord>> {
    let query = supabase
      .from('chat_histories')
      .select('*')
      .eq('user_id', userId);
    
    if (chapterId) query = query.eq('chapter_id', chapterId);
    if (conversationType) query = query.eq('conversation_type', conversationType);
    if (conversationMedium) query = query.eq('conversation_medium', conversationMedium);

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return { data: [], error: this.handleError(error) };
    }

    return { data: data as ChatHistoryRecord[], error: null, count: count ?? undefined };
  }

  async deleteSession(sessionId: string): Promise<RepositoryResult<boolean>> {
    const { error } = await supabase
      .from('chat_histories')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      return { data: null, error: this.handleError(error) };
    }

    return { data: true, error: null };
  }

  async getConversationStats(userId: string): Promise<RepositoryResult<{
    totalConversations: number;
    textConversations: number;
    voiceConversations: number;
    totalMessages: number;
  }>> {
    const { data: conversations, error } = await supabase
      .from('chat_histories')
      .select('conversation_medium, messages')
      .eq('user_id', userId) as any;

    if (error) {
      return { data: null, error: this.handleError(error) };
    }

    const stats = {
      totalConversations: conversations.length,
      textConversations: conversations.filter(c => c.conversation_medium === 'text').length,
      voiceConversations: conversations.filter(c => c.conversation_medium === 'voice').length,
      totalMessages: conversations.reduce((sum, c) => sum + (Array.isArray(c.messages) ? c.messages.length : 0), 0)
    };

    return { data: stats, error: null };
  }

  // Convert database record to conversation session
  mapToConversationSession(record: ChatHistoryRecord): ConversationSession {
    return {
      sessionId: record.session_id,
      conversationType: record.conversation_type,
      conversationMedium: record.conversation_medium,
      messages: Array.isArray(record.messages) ? record.messages : [],
      context: record.context_snapshot,
      goals: Array.isArray(record.conversation_goals) ? record.conversation_goals : [],
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }
}

// Singleton instance
export const conversationRepository = new ConversationRepository();