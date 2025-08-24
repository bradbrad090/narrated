// Medium-specific handlers for different conversation types

import { 
  ConversationMediumInterface, 
  ConversationSession, 
  StartConversationParams, 
  SendMessageParams,
  ConversationType,
  ConversationMessage,
  ConversationMedium
} from '@/types/conversation';
import { supabase } from '@/integrations/supabase/client';
import { ConversationStrategyFactory } from '@/strategies/conversationStrategies';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';
import { QuestionTrackingService } from '@/services/QuestionTrackingService';

// Base handler with common functionality
abstract class BaseConversationHandler implements ConversationMediumInterface {
  abstract type: ConversationMedium;

  abstract start(params: StartConversationParams): Promise<ConversationSession>;
  abstract sendMessage(params: SendMessageParams): Promise<ConversationSession>;
  abstract end(): Promise<void>;

  isSupported(): boolean {
    return true;
  }

  protected generateSessionId(prefix: string = 'session'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async saveToDatabase(session: ConversationSession, userId: string, chapterId?: string): Promise<void> {
    const { error } = await supabase
      .from('chat_histories')
      .insert({
        user_id: userId,
        chapter_id: chapterId,
        session_id: session.sessionId,
        conversation_type: session.conversationType,
        conversation_medium: session.conversationMedium,
        is_self_conversation: session.isSelfConversation || false,
        messages: session.messages as any,
        context_snapshot: session.context as any || {},
        conversation_goals: session.goals as any || []
      });

    if (error) {
      throw new Error(`Failed to save conversation: ${error.message}`);
    }
  }

  protected async updateInDatabase(session: ConversationSession): Promise<void> {
    const { error } = await supabase
      .from('chat_histories')
      .update({ 
        messages: session.messages as any,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', session.sessionId);

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }
  }

  protected async trackQuestionsInResponse(
    response: string,
    userId: string,
    bookId: string,
    conversationType: ConversationType,
    chapterId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const questionTrackingService = new QuestionTrackingService();
      await questionTrackingService.trackQuestionsFromResponse(
        response,
        userId,
        bookId,
        conversationType,
        chapterId,
        sessionId
      );
    } catch (error) {
      console.warn('Failed to track questions from AI response:', error);
      // Don't throw - question tracking is supplementary functionality
    }
  }
}

// Text conversation handler
export class TextConversationHandler extends BaseConversationHandler {
  type: ConversationMedium = 'text';

  async start(params: StartConversationParams): Promise<ConversationSession> {
    const strategy = ConversationStrategyFactory.getStrategy(params.conversationType);
    const sessionId = this.generateSessionId('text');

    // Call the AI conversation edge function
    const { data, error } = await supabase.functions.invoke(
      'ai-conversation-realtime',
      {
        body: {
          action: 'start_session',
          userId: params.userId,
          bookId: params.bookId,
          chapterId: params.chapterId,
          conversationType: params.conversationType,
          context: params.context,
          styleInstructions: params.styleInstructions
        }
      }
    );

    if (error) {
      throw new Error(`Failed to start text conversation: ${error.message}`);
    }

    const session: ConversationSession = {
      sessionId: data.sessionId,
      conversationType: params.conversationType,
      conversationMedium: 'text',
      messages: [
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        }
      ],
      context: params.context,
      goals: data.goals,
      styleInstructions: params.styleInstructions,
      createdAt: new Date().toISOString()
    };

    return session;
  }

  async sendMessage(params: SendMessageParams): Promise<ConversationSession> {
    const userMessage: ConversationMessage = {
      role: 'user',
      content: params.message,
      timestamp: new Date().toISOString()
    };

    const updatedSession = {
      ...params.session,
      messages: [...params.session.messages, userMessage],
      updatedAt: new Date().toISOString()
    };

    // Send to AI
    const { data, error } = await supabase.functions.invoke(
      'ai-conversation-realtime',
      {
        body: {
          action: 'send_message',
          sessionId: params.session.sessionId,
          message: params.message,
          userId: params.userId,
          bookId: params.bookId,
          context: params.context,
          conversationType: params.session.conversationType,
          styleInstructions: params.session.styleInstructions
        }
      }
    );

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    const aiMessage: ConversationMessage = {
      role: 'assistant',
      content: data.response,
      timestamp: new Date().toISOString()
    };

    const finalSession = {
      ...updatedSession,
      messages: [...updatedSession.messages, aiMessage]
    };

    // Track questions in AI response
    await this.trackQuestionsInResponse(
      data.response,
      params.userId,
      params.bookId,
      params.session.conversationType,
      params.session.context?.currentChapter?.id,
      params.session.sessionId
    );

    // Update in database
    await this.updateInDatabase(finalSession);

    return finalSession;
  }

  async end(): Promise<void> {
    // Text conversations don't need special cleanup
  }
}

// Self conversation handler
export class SelfConversationHandler extends BaseConversationHandler {
  type: ConversationMedium = 'self';

  async start(params: StartConversationParams): Promise<ConversationSession> {
    // Self conversations don't need AI initialization
    const sessionId = this.generateSessionId('self');
    
    const session: ConversationSession = {
      sessionId,
      conversationType: 'reflection', // Self conversations are always reflective
      conversationMedium: 'self',
      messages: [],
      context: params.context,
      goals: [
        'Document personal thoughts and reflections',
        'Capture self-directed memories and experiences', 
        'Preserve authentic personal voice and perspective'
      ],
      isSelfConversation: true,
      createdAt: new Date().toISOString()
    };

    return session;
  }

  async sendMessage(params: SendMessageParams): Promise<ConversationSession> {
    const userMessage: ConversationMessage = {
      role: 'user',
      content: params.message,
      timestamp: new Date().toISOString()
    };

    const updatedSession = {
      ...params.session,
      messages: [...params.session.messages, userMessage],
      updatedAt: new Date().toISOString()
    };

    // Save the self conversation entry to database
    await this.saveToDatabase(updatedSession, params.userId);

    return updatedSession;
  }

  async end(): Promise<void> {
    // Self conversations don't need special cleanup
  }
}

// Voice conversation handler
export class VoiceConversationHandler extends BaseConversationHandler {
  type: ConversationMedium = 'voice';
  private currentSession: ConversationSession | null = null;

  async start(params: StartConversationParams): Promise<ConversationSession> {
    const sessionId = this.generateSessionId('voice');
    
    const session: ConversationSession = {
      sessionId,
      conversationType: params.conversationType,
      conversationMedium: 'voice',
      messages: [],
      context: params.context,
      goals: ConversationStrategyFactory.getStrategy(params.conversationType).generateGoals(),
      styleInstructions: params.styleInstructions,
      createdAt: new Date().toISOString()
    };

    this.currentSession = session;
    
    // Voice conversations are handled by the VoiceInterface component
    // This handler mainly provides the session structure
    return session;
  }

  async sendMessage(params: SendMessageParams): Promise<ConversationSession> {
    // Voice messages are handled by the VoiceInterface component
    // This method is mainly for compatibility
    throw new Error('Voice messages are handled directly by the VoiceInterface component');
  }

  async end(): Promise<void> {
    if (this.currentSession) {
      // Save the voice conversation to database when ending
      // The actual messages will be populated by the VoiceInterface component
      this.currentSession = null;
    }
  }

  getCurrentSession(): ConversationSession | null {
    return this.currentSession;
  }

  updateCurrentSession(session: ConversationSession): void {
    this.currentSession = session;
  }
}

// Handler factory
export class ConversationHandlerFactory {
  private static handlers: Map<ConversationMedium, BaseConversationHandler> = new Map([
    ['text', new TextConversationHandler()],
    ['self', new SelfConversationHandler()],
    ['voice', new VoiceConversationHandler()]
  ]);

  static getHandler(medium: ConversationMedium): BaseConversationHandler {
    const handler = this.handlers.get(medium);
    if (!handler) {
      throw new Error(`Unknown conversation medium: ${medium}`);
    }
    return handler;
  }

  static getAllHandlers(): BaseConversationHandler[] {
    return Array.from(this.handlers.values());
  }
}