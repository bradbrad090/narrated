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
  
  // Enhanced Style Instructions
  STYLE_PROMPTS: {
    CONCISE: "Respond only with short, direct questions or prompts to elicit more details or advance the story. Keep responses to 1-2 sentences maximum. Avoid all pleasantries, affirmations, summaries, or chit-chat—focus solely on prompting continuation. Probe deeper on vague responses with concise follow-ups.",
    CONVERSATIONAL: "Respond naturally and ask engaging follow-up questions. Keep responses warm and conversational (2-3 sentences). Always end with a question that encourages more storytelling.",
    DEEP_DIVE: "Ask thoughtful, emotionally-aware questions that help uncover deeper meanings, feelings, and connections. Focus on the 'why' and 'how' behind events. Help explore relationships, motivations, and personal growth moments.",
    CHRONOLOGICAL: "Guide the conversation in chronological order, helping to build a clear timeline. Ask about what happened next, previous events, or specific time periods. Maintain narrative flow and continuity.",
  },
  
  // Smart Continuation Prompts
  CONTINUATION_PROMPTS: {
    STORY_GAPS: [
      "What happened right before that moment?",
      "Can you tell me more about what led up to that?",
      "What was going through your mind during that time?"
    ],
    EMOTIONAL_DEPTH: [
      "How did that make you feel?",
      "What was the most challenging part about that experience?",
      "Looking back, what did that moment teach you?"
    ],
    RELATIONSHIP_FOCUS: [
      "Who else was important during that time?",
      "How did that affect your relationships?",
      "What would you want them to know about that experience?"
    ],
    SENSORY_DETAILS: [
      "What do you remember about how it looked/sounded/felt?",
      "Can you paint me a picture of that scene?",
      "What details stand out most vividly in your memory?"
    ]
  },
  
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
  
  // Smart Suggestions
  SUGGESTIONS: {
    CONTINUE_STORY: "Continue your story...",
    ADD_DETAILS: "Add more details about this experience",
    EXPLORE_FEELINGS: "Tell me how this made you feel",
    CONNECT_EVENTS: "How did this connect to other parts of your life?",
    DESCRIBE_PEOPLE: "Who were the important people in this story?",
  }
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