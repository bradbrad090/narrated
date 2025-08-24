// Conversation mediator to coordinate between different handlers and manage state

import { 
  ConversationType, 
  ConversationMedium, 
  ConversationSession, 
  ConversationContext,
  StartConversationParams,
  SendMessageParams
} from '@/types/conversation';
import { ConversationHandlerFactory } from '@/handlers/conversationHandlers';
import { ConversationStrategyFactory } from '@/strategies/conversationStrategies';

export class ConversationMediator {
  private activeHandlers: Map<string, any> = new Map();

  /**
   * Start a conversation using the appropriate handler for the medium
   */
  async startConversation(
    medium: ConversationMedium,
    params: StartConversationParams
  ): Promise<ConversationSession> {
    const handler = ConversationHandlerFactory.getHandler(medium);
    
    if (!handler.isSupported()) {
      throw new Error(`${medium} conversations are not supported in this environment`);
    }

    try {
      const session = await handler.start(params);
      this.activeHandlers.set(session.sessionId, { handler, medium });
      return session;
    } catch (error) {
      throw new Error(`Failed to start ${medium} conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a message in an active conversation
   */
  async sendMessage(
    session: ConversationSession,
    params: SendMessageParams
  ): Promise<ConversationSession> {
    const activeHandler = this.activeHandlers.get(session.sessionId);
    
    if (!activeHandler) {
      throw new Error(`No active handler found for session ${session.sessionId}`);
    }

    try {
      return await activeHandler.handler.sendMessage(params);
    } catch (error) {
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * End a conversation and clean up resources
   */
  async endConversation(sessionId: string): Promise<void> {
    const activeHandler = this.activeHandlers.get(sessionId);
    
    if (!activeHandler) {
      // Session might already be ended, don't throw error
      return;
    }

    try {
      await activeHandler.handler.end();
      this.activeHandlers.delete(sessionId);
    } catch (error) {
      console.error(`Error ending conversation ${sessionId}:`, error);
      // Still remove from active handlers even if end() failed
      this.activeHandlers.delete(sessionId);
    }
  }

  /**
   * Resume an existing conversation
   */
  async resumeConversation(
    session: ConversationSession
  ): Promise<void> {
    const handler = ConversationHandlerFactory.getHandler(session.conversationMedium);
    this.activeHandlers.set(session.sessionId, { 
      handler, 
      medium: session.conversationMedium 
    });
  }

  /**
   * Get available conversation types for a medium
   */
  getAvailableTypes(medium: ConversationMedium): ConversationType[] {
    return ['interview']; // Only interview type is available
  }

  /**
   * Get conversation goals for a type
   */
  getConversationGoals(type: ConversationType): string[] {
    const strategy = ConversationStrategyFactory.getStrategy(type);
    return strategy.generateGoals();
  }

  /**
   * Check if a medium is supported
   */
  isMediumSupported(medium: ConversationMedium): boolean {
    try {
      const handler = ConversationHandlerFactory.getHandler(medium);
      return handler.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Get active conversation count
   */
  getActiveConversationCount(): number {
    return this.activeHandlers.size;
  }

  /**
   * Get active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeHandlers.keys());
  }

  /**
   * Clean up all active conversations
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.activeHandlers.keys()).map(
      sessionId => this.endConversation(sessionId)
    );
    
    await Promise.allSettled(cleanupPromises);
    this.activeHandlers.clear();
  }

  /**
   * Validate conversation parameters
   */
  validateStartParams(params: StartConversationParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.userId) {
      errors.push('User ID is required');
    }

    if (!params.bookId) {
      errors.push('Book ID is required');
    }

    if (!params.conversationType) {
      errors.push('Conversation type is required');
    }

    if (!params.context) {
      errors.push('Context is required');
    }

    const availableTypes = ConversationStrategyFactory.getAllStrategies().map(s => s.type);
    if (params.conversationType && !availableTypes.includes(params.conversationType)) {
      errors.push(`Invalid conversation type: ${params.conversationType}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate send message parameters
   */
  validateSendParams(params: SendMessageParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.session) {
      errors.push('Session is required');
    }

    if (!params.message?.trim()) {
      errors.push('Message content is required');
    }

    if (!params.userId) {
      errors.push('User ID is required');
    }

    if (!params.context) {
      errors.push('Context is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const conversationMediator = new ConversationMediator();