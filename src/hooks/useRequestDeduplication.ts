import { useRef, useCallback } from 'react';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

/**
 * Hook to prevent duplicate API requests
 */
export function useRequestDeduplication(timeoutMs: number = 5000) {
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());

  const deduplicatedRequest = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const now = Date.now();
    const existing = pendingRequests.current.get(key);

    // If there's a pending request and it's not too old, return it
    if (existing && (now - existing.timestamp) < timeoutMs) {
      return existing.promise;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up after request completes
      pendingRequests.current.delete(key);
    });

    // Store the pending request
    pendingRequests.current.set(key, {
      promise,
      timestamp: now
    });

    return promise;
  }, [timeoutMs]);

  const clearPendingRequests = useCallback(() => {
    pendingRequests.current.clear();
  }, []);

  return {
    deduplicatedRequest,
    clearPendingRequests
  };
}