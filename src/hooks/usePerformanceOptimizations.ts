import { useCallback, useMemo, useRef } from 'react';
import { ConversationSession } from '@/types/conversation';
import { config } from '@/config/environment';

/**
 * Performance optimization hooks for conversation system
 */

// Memoized conversation filtering and sorting
export function useOptimizedConversationList(
  conversations: ConversationSession[],
  searchQuery: string,
  filterType: string
) {
  return useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session => 
        session.messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        ) ||
        session.conversationType.toLowerCase().includes('interview')
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(session => {
        switch (filterType) {
          case 'text':
            return session.conversationMedium === 'text';
          case 'voice':
            return session.conversationMedium === 'voice';
          default:
            return true;
        }
      });
    }

    // Sort by most recent first
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [conversations, searchQuery, filterType]);
}

// Optimized conversation statistics calculation
export function useConversationStats(conversations: ConversationSession[]) {
  return useMemo(() => {
    const stats = {
      total: conversations.length,
      textChat: 0,
      voiceChat: 0,
      totalMessages: 0,
      avgMessagesPerConversation: 0,
      mostActiveDay: '',
      recentActivityTrend: 'stable' as 'up' | 'down' | 'stable'
    };

    if (conversations.length === 0) {
      return stats;
    }

    // Calculate basic stats
    conversations.forEach(session => {
      if (session.conversationMedium === 'text') {
        stats.textChat++;
      } else if (session.conversationMedium === 'voice') {
        stats.voiceChat++;
      }
      
      stats.totalMessages += session.messages.length;
    });

    stats.avgMessagesPerConversation = Math.round(stats.totalMessages / stats.total);

    // Find most active day
    const dayCountMap = new Map<string, number>();
    conversations.forEach(session => {
      const day = new Date(session.createdAt).toDateString();
      dayCountMap.set(day, (dayCountMap.get(day) || 0) + 1);
    });

    let maxCount = 0;
    for (const [day, count] of dayCountMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        stats.mostActiveDay = day;
      }
    }

    // Calculate recent activity trend (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentCount = conversations.filter(s => 
      new Date(s.createdAt) >= sevenDaysAgo
    ).length;
    
    const previousCount = conversations.filter(s => 
      new Date(s.createdAt) >= fourteenDaysAgo && new Date(s.createdAt) < sevenDaysAgo
    ).length;

    if (recentCount > previousCount) {
      stats.recentActivityTrend = 'up';
    } else if (recentCount < previousCount) {
      stats.recentActivityTrend = 'down';
    }

    return stats;
  }, [conversations]);
}

// Throttled scroll handler for virtual scrolling
export function useThrottledScrollHandler(callback: () => void, delay: number = 16) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);

  return useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      callback();
      lastCallRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback();
        lastCallRef.current = Date.now();
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);
}

// Memory-efficient conversation session cache
export function useConversationCache(maxSize: number = config.performance.conversationHistoryLimit) {
  const cacheRef = useRef<Map<string, ConversationSession>>(new Map());

  const getCachedSession = useCallback((sessionId: string): ConversationSession | undefined => {
    return cacheRef.current.get(sessionId);
  }, []);

  const setCachedSession = useCallback((session: ConversationSession) => {
    const cache = cacheRef.current;
    
    // If cache is at max size, remove oldest entry
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
    
    cache.set(session.sessionId, session);
  }, [maxSize]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheStats = useCallback(() => ({
    size: cacheRef.current.size,
    maxSize,
    utilizationPercent: (cacheRef.current.size / maxSize) * 100
  }), [maxSize]);

  return {
    getCachedSession,
    setCachedSession,
    clearCache,
    getCacheStats
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const metricsRef = useRef<Map<string, number[]>>(new Map());

  const measurePerformance = useCallback((
    operationName: string,
    operation: () => Promise<any> | any
  ) => {
    const start = performance.now();
    
    const recordMetric = (duration: number) => {
      const metrics = metricsRef.current.get(operationName) || [];
      metrics.push(duration);
      
      // Keep only last 100 measurements
      if (metrics.length > 100) {
        metrics.shift();
      }
      
      metricsRef.current.set(operationName, metrics);
    };

    try {
      const result = operation();
      
      if (result && typeof result.then === 'function') {
        // Async operation
        return result.then((value: any) => {
          const duration = performance.now() - start;
          recordMetric(duration);
          return value;
        }).catch((error: any) => {
          const duration = performance.now() - start;
          recordMetric(duration);
          throw error;
        });
      } else {
        // Sync operation
        const duration = performance.now() - start;
        recordMetric(duration);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - start;
      recordMetric(duration);
      throw error;
    }
  }, []);

  const getPerformanceMetrics = useCallback((operationName?: string) => {
    if (operationName) {
      const metrics = metricsRef.current.get(operationName) || [];
      return {
        operationName,
        count: metrics.length,
        average: metrics.length > 0 ? metrics.reduce((a, b) => a + b, 0) / metrics.length : 0,
        min: metrics.length > 0 ? Math.min(...metrics) : 0,
        max: metrics.length > 0 ? Math.max(...metrics) : 0,
        latest: metrics[metrics.length - 1] || 0
      };
    }

    // Return all metrics
    const allMetrics: Record<string, any> = {};
    for (const [name, values] of metricsRef.current.entries()) {
      allMetrics[name] = {
        count: values.length,
        average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        latest: values[values.length - 1] || 0
      };
    }
    
    return allMetrics;
  }, []);

  return {
    measurePerformance,
    getPerformanceMetrics
  };
}
