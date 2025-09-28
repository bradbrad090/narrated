// Standardized API response formats and types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Edge Function Request/Response Types
export interface ConversationStartRequest {
  userId: string;
  bookId: string;
  chapterId?: string;
  conversationType: string;
  context?: any;
}

export interface ConversationStartResponse {
  sessionId: string;
  response: string;
  goals: string[];
  conversationType: string;
}

export interface ConversationMessageRequest {
  sessionId: string;
  message: string;
  userId: string;
  bookId: string;
  context?: any;
  conversationType: string;
}

export interface ConversationMessageResponse {
  response: string;
  sessionId: string;
  messageCount: number;
  updated: boolean;
}

// Utility functions for creating standardized responses
export class ApiResponseBuilder {
  static success<T>(data: T, requestId?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  static error(
    code: string, 
    message: string, 
    details?: Record<string, any>,
    requestId?: string
  ): ApiResponse<null> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  static paginated<T>(
    items: T[],
    page: number,
    pageSize: number,
    total: number,
    requestId?: string
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      success: true,
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      },
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  static fromRepositoryResult<T>(
    result: { data: T | null; error: any },
    requestId?: string
  ): ApiResponse<T> {
    if (result.error) {
      return this.error(
        result.error.code || 'REPOSITORY_ERROR',
        result.error.message || 'Repository operation failed',
        result.error.details,
        requestId
      );
    }

    return this.success(result.data!, requestId);
  }
}

// Error codes enum for consistency
export enum ApiErrorCode {
  // General errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Conversation errors
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  CONVERSATION_CREATION_FAILED = 'CONVERSATION_CREATION_FAILED',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  UNSUPPORTED_MEDIUM = 'UNSUPPORTED_MEDIUM',

  // Context errors
  CONTEXT_BUILD_FAILED = 'CONTEXT_BUILD_FAILED',
  CONTEXT_CACHE_ERROR = 'CONTEXT_CACHE_ERROR',

  // AI service errors
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_RESPONSE_ERROR = 'AI_RESPONSE_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION'
}