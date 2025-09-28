// Configuration constants for the conversation system
export const CONVERSATION_CONFIG = {
  // UI Constants
  MAX_MESSAGE_HISTORY_DISPLAY: 10,
  MESSAGE_INPUT_MIN_HEIGHT: '80px',
  CONVERSATION_SCROLL_HEIGHT: '400px',
  CONVERSATION_HISTORY_HEIGHT: '500px',
  
  // Timing Constants
  DRAFT_SAVE_DELAY_MS: 1000,
  API_TIMEOUT_MS: 30000,
  RETRY_DELAY_BASE_MS: 1000,
  MAX_RETRY_ATTEMPTS: 3,
  
  // OpenAI Configuration
  DEFAULT_MODEL: "gpt-4.1-2025-04-14",
  MAX_COMPLETION_TOKENS: 500,
  
  // Database Limits
  CONVERSATION_HISTORY_LIMIT: 10,
  MESSAGE_CONTEXT_LIMIT: 10,
  
  
  // Button Text
  BUTTON_TEXT: {
    SAVE_STORY: "Save Story",
    START_CONVERSATION: "Start Conversation",
    END_CONVERSATION: "End Call",
    START_VOICE_CHAT: "Start Voice Chat",
    CONNECTING: "Connecting...",
  },
  
  // Toast Messages  
  MESSAGES: {
    CONVERSATION_STARTED: "Conversation Started",
    CONVERSATION_ENDED: "Voice Chat Ended",
    CONVERSATION_RESUMED: "Conversation Resumed",
    ENTRY_SAVED: "Entry saved",
    VOICE_CHAT_CONNECTED: "Voice Chat Connected",
    CONNECTION_ERROR: "Connection Error",
    CONTEXT_LOADING_ERROR: "Context Loading Error",
    MESSAGE_FAILED: "Message Failed",
    SMART_SUGGESTION: "Suggestion Available",
  },
  
} as const;

// Conversation Types
export type ConversationType = 'interview';
export type ConversationMedium = 'text' | 'voice';

// Error Types for standardized error handling
export enum ConversationErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AI_SERVICE = 'ai_service', 
  PERMISSION = 'permission',
  TIMEOUT = 'timeout'
}

export interface ConversationError {
  type: ConversationErrorType;
  message: string;
  recoverable: boolean;
  originalError?: Error;
}

// Helper function to create standardized errors
export const createConversationError = (
  type: ConversationErrorType,
  message: string,
  recoverable: boolean = true,
  originalError?: Error
): ConversationError => ({
  type,
  message,
  recoverable,
  originalError
});