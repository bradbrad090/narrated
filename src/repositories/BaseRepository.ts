// Base repository with common database operations and transaction handling

import { PostgrestError } from '@supabase/supabase-js';

export interface RepositoryError {
  code: string;
  message: string;
  details?: any;
  hint?: string;
}

export interface RepositoryResult<T> {
  data: T | null;
  error: RepositoryError | null;
}

export interface RepositoryListResult<T> {
  data: T[];
  error: RepositoryError | null;
  count?: number;
}

export abstract class BaseRepository {
  protected handleError(error: PostgrestError): RepositoryError {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message,
      details: error.details,
      hint: error.hint
    };
  }

  protected async executeTransaction<T>(
    operations: () => Promise<T>
  ): Promise<RepositoryResult<T>> {
    try {
      const result = await operations();
      return { data: result, error: null };
    } catch (error) {
      console.error('Transaction failed:', error);
      return {
        data: null,
        error: error instanceof Error 
          ? { code: 'TRANSACTION_ERROR', message: error.message }
          : { code: 'UNKNOWN_ERROR', message: 'Unknown transaction error' }
      };
    }
  }
}