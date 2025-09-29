// Comprehensive TypeScript interfaces for the conversation system

export type ConversationType = 'interview';
export type ConversationMedium = 'text' | 'voice';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationSession {
  sessionId: string;
  conversationType: ConversationType;
  conversationMedium: ConversationMedium;
  messages: ConversationMessage[];
  context?: ConversationContext;
  goals?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationContext {
  userProfile: UserProfile;
  bookProfile: BookProfile;
  currentChapter?: Chapter;
  recentChapters: Chapter[];
  lifeThemes: string[];
}

export interface UserProfile {
  id: string;
  fullName?: string;
  age?: number;
  email?: string;
}

export interface BookProfile {
  id: string;
  title?: string;
  lifePhilosophy?: string;
  valuesBeliefs?: string;
  occupation?: string;
  relationshipsFamily?: string;
  memorableQuotes?: string[];
  birthYear?: number;
  writingStylePreference?: string;
  familyBackground?: string;
  careerHighlights?: string[];
  education?: string;
  fullName?: string;
  lifeThemes?: string[];
  personalityTraits?: string[];
  birthplace?: string;
  currentLocation?: string;
  languagesSpoken?: string[];
  keyLifeEvents?: string[];
  culturalBackground?: string;
  hobbiesInterests?: string[];
  challengesOvercome?: string[];
}

export interface Chapter {
  id: string;
  bookId: string;
  userId: string;
  chapterNumber: number;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt?: string;
}

// State management interfaces
export interface ConversationState {
  currentSession: ConversationSession | null;
  history: ConversationSession[];
  context: ConversationContext | null;
  ui: UIState;
  drafts: Record<string, string>;
}

export interface UIState {
  isLoading: boolean;
  isTyping: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  error: ConversationError | null;
}

export interface ConversationError {
  type: 'network' | 'validation' | 'ai_service' | 'permission' | 'timeout';
  message: string;
  recoverable: boolean;
  originalError?: Error;
}

// Action types for state management
export type ConversationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_SPEAKING'; payload: boolean }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: ConversationError | null }
  | { type: 'SET_CURRENT_SESSION'; payload: ConversationSession | null }
  | { type: 'SET_HISTORY'; payload: ConversationSession[] }
  | { type: 'ADD_TO_HISTORY'; payload: ConversationSession }
  | { type: 'UPDATE_SESSION'; payload: ConversationSession }
  | { type: 'SET_CONTEXT'; payload: ConversationContext | null }
  | { type: 'SET_DRAFT'; payload: { sessionId: string; draft: string } }
  | { type: 'CLEAR_DRAFT'; payload: string }
  | { type: 'RESET_STATE' };

// Strategy pattern interfaces
export interface ConversationStrategy {
  type: ConversationType;
  generateGoals(): string[];
  buildInitialPrompt(context: ConversationContext): string;
  buildConversationPrompt(
    context: ConversationContext, 
    messages: ConversationMessage[]
  ): string;
}

// Medium handler interfaces
export interface ConversationMediumInterface {
  type: ConversationMedium;
  start(params: StartConversationParams): Promise<ConversationSession>;
  sendMessage(params: SendMessageParams): Promise<ConversationSession>;
  end(): Promise<void>;
  isSupported(): boolean;
}

export interface StartConversationParams {
  userId: string;
  bookId: string;
  chapterId?: string;
  conversationType: ConversationType;
  context: ConversationContext;
}

export interface SendMessageParams {
  session: ConversationSession;
  message: string;
  userId: string;
  context: ConversationContext;
}

// Response types from edge functions
export interface ConversationResponse {
  sessionId: string;
  response: string;
  conversationType: ConversationType;
  goals: string[];
}

export interface MessageResponse {
  response: string;
  sessionId: string;
  messageCount: number;
}

// Database interfaces  
export interface ChatHistoryRecord {
  id: string;
  user_id: string;
  chapter_id?: string;
  session_id: string;
  conversation_type: ConversationType;
  conversation_medium: ConversationMedium;
  messages: any; // Using any for Json compatibility
  context_snapshot: any; // Using any for Json compatibility  
  
  created_at: string;
  updated_at?: string;
}