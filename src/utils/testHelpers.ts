// Test utilities and mock services for conversation system testing

import { ConversationSession, ConversationMessage, ConversationContext, ConversationType, ConversationMedium } from '@/types/conversation';

// Mock conversation data generators
export const createMockMessage = (
  role: 'user' | 'assistant' = 'user',
  content: string = 'Test message',
  timestamp?: string
): ConversationMessage => ({
  role,
  content,
  timestamp: timestamp || new Date().toISOString()
});

export const createMockSession = (
  overrides: Partial<ConversationSession> = {}
): ConversationSession => ({
  sessionId: `test-session-${Date.now()}`,
  conversationType: 'interview' as ConversationType,
  conversationMedium: 'text' as ConversationMedium,
  messages: [
    createMockMessage('assistant', 'Hello! How can I help you today?'),
    createMockMessage('user', 'I want to share some memories.')
  ],
  context: createMockContext(),
  goals: ['Document memories', 'Capture experiences'],
  createdAt: new Date().toISOString(),
  ...overrides
});

export const createMockContext = (
  overrides: Partial<ConversationContext> = {}
): ConversationContext => ({
  userProfile: {
    id: 'test-user-id',
    fullName: 'Test User',
    age: 30,
    email: 'test@example.com'
  },
  bookProfile: {
    id: 'test-book-id',
    title: 'My Life Story',
    fullName: 'Test User',
    lifePhilosophy: 'Live life to the fullest'
  },
  recentChapters: [],
  lifeThemes: ['Family', 'Career', 'Travel'],
  ...overrides
});

// Mock repository for testing
export class MockConversationRepository {
  private sessions: Map<string, ConversationSession> = new Map();

  async saveSession(userId: string, session: ConversationSession) {
    this.sessions.set(session.sessionId, session);
    return { data: session, error: null };
  }

  async getSessionById(sessionId: string) {
    const session = this.sessions.get(sessionId);
    return session ? { data: session, error: null } : { data: null, error: { code: 'NOT_FOUND', message: 'Session not found' } };
  }

  async getUserConversations(userId: string) {
    const userSessions = Array.from(this.sessions.values()).filter(s => 
      s.context?.userProfile.id === userId
    );
    return { data: userSessions, error: null };
  }

  async updateSession(session: ConversationSession) {
    if (this.sessions.has(session.sessionId)) {
      this.sessions.set(session.sessionId, session);
      return { data: session, error: null };
    }
    return { data: null, error: { code: 'NOT_FOUND', message: 'Session not found' } };
  }

  async deleteSession(sessionId: string) {
    const deleted = this.sessions.delete(sessionId);
    return { data: deleted, error: null };
  }

  mapToConversationSession(record: any): ConversationSession {
    return record;
  }

  clear() {
    this.sessions.clear();
  }

  size() {
    return this.sessions.size;
  }
}

// Mock context cache service
export class MockContextCacheService {
  private cache: Map<string, any> = new Map();

  async getContext(userId: string, bookId: string, chapterId?: string) {
    const key = `${userId}:${bookId}:${chapterId || 'default'}`;
    return this.cache.get(key) || null;
  }

  async setContext(userId: string, bookId: string, context: ConversationContext, chapterId?: string) {
    const key = `${userId}:${bookId}:${chapterId || 'default'}`;
    this.cache.set(key, context);
  }

  async invalidateContext(userId: string, bookId: string, chapterId?: string) {
    const key = `${userId}:${bookId}:${chapterId || 'default'}`;
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Performance testing helpers
export const measureExecutionTime = async <T>(
  operation: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  
  if (label) {
    console.log(`${label} took ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

export const createMockConversations = (count: number): ConversationSession[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockSession({
      sessionId: `mock-session-${index}`,
      conversationType: ['interview', 'reflection', 'brainstorming'][index % 3] as ConversationType,
      conversationMedium: ['text', 'voice', 'self'][index % 3] as ConversationMedium,
      isSelfConversation: index % 3 === 2,
      createdAt: new Date(Date.now() - (count - index) * 24 * 60 * 60 * 1000).toISOString()
    })
  );
};

// Error simulation helpers
export const simulateNetworkError = () => {
  throw new Error('Network request failed');
};

export const simulateTimeout = (delay: number = 1000) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), delay);
  });
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock console methods to avoid noise in tests
  const originalConsole = { ...console };
  
  return {
    restore: () => {
      Object.assign(console, originalConsole);
    }
  };
};

// Assertion helpers - simple validation functions
export const validateConversationSessionShape = (session: any): boolean => {
  return !!(session?.sessionId && 
           session?.conversationType && 
           session?.conversationMedium && 
           Array.isArray(session?.messages) && 
           session?.createdAt);
};

export const validateMessageShape = (message: any): boolean => {
  return !!(message?.role && 
           message?.content && 
           message?.timestamp &&
           ['user', 'assistant'].includes(message.role) &&
           typeof message.content === 'string');
};

// Component testing utilities
export const waitForElement = (selector: string, timeout: number = 5000): Promise<Element> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};