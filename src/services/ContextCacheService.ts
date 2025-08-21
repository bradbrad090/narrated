// Context caching service for conversation context management

import { ConversationContext } from '@/types/conversation';
import { supabase } from '@/integrations/supabase/client';

interface CachedContext {
  userId: string;
  bookId: string;
  chapterId?: string;
  context: ConversationContext;
  expiresAt: string;
  createdAt: string;
}

export class ContextCacheService {
  private memoryCache = new Map<string, CachedContext>();
  private readonly CACHE_DURATION_MINUTES = 30;
  private readonly CLEANUP_INTERVAL_MINUTES = 5;

  constructor() {
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
  }

  private generateCacheKey(userId: string, bookId: string, chapterId?: string): string {
    return `context:${userId}:${bookId}${chapterId ? `:${chapterId}` : ''}`;
  }

  private isExpired(expiresAt: string): boolean {
    return new Date() > new Date(expiresAt);
  }

  private getExpirationTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + this.CACHE_DURATION_MINUTES);
    return now.toISOString();
  }

  async getContext(
    userId: string, 
    bookId: string, 
    chapterId?: string
  ): Promise<ConversationContext | null> {
    const cacheKey = this.generateCacheKey(userId, bookId, chapterId);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry.expiresAt)) {
      console.log('Context cache hit (memory):', cacheKey);
      return memoryEntry.context;
    }

    // Check database cache
    try {
      const { data, error } = await supabase
        .from('conversation_context_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter_id', chapterId || null)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking context cache:', error);
        return null;
      }

      if (data) {
        console.log('Context cache hit (database):', cacheKey);
        const cachedContext: CachedContext = {
          userId,
          bookId,
          chapterId,
          context: data.context_data as unknown as ConversationContext,
          expiresAt: data.expires_at,
          createdAt: data.created_at
        };

        // Store in memory cache for faster access
        this.memoryCache.set(cacheKey, cachedContext);
        
        return data.context_data as unknown as ConversationContext;
      }
    } catch (error) {
      console.error('Error accessing context cache:', error);
    }

    console.log('Context cache miss:', cacheKey);
    return null;
  }

  async setContext(
    userId: string, 
    bookId: string, 
    context: ConversationContext,
    chapterId?: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(userId, bookId, chapterId);
    const expiresAt = this.getExpirationTime();

    const cachedContext: CachedContext = {
      userId,
      bookId,
      chapterId,
      context,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, cachedContext);

    // Store in database cache
    try {
      const { error } = await supabase
        .from('conversation_context_cache')
        .upsert({
          user_id: userId,
          book_id: bookId,
          chapter_id: chapterId,
          context_data: context as any,
          expires_at: expiresAt
        }, {
          onConflict: 'user_id,book_id,chapter_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error caching context in database:', error);
      } else {
        console.log('Context cached:', cacheKey);
      }
    } catch (error) {
      console.error('Error storing context cache:', error);
    }
  }

  async invalidateContext(userId: string, bookId: string, chapterId?: string): Promise<void> {
    const cacheKey = this.generateCacheKey(userId, bookId, chapterId);

    // Remove from memory cache
    this.memoryCache.delete(cacheKey);

    // Remove from database cache
    try {
      const { error } = await supabase
        .from('conversation_context_cache')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('chapter_id', chapterId || null);

      if (error) {
        console.error('Error invalidating context cache:', error);
      } else {
        console.log('Context cache invalidated:', cacheKey);
      }
    } catch (error) {
      console.error('Error removing context cache:', error);
    }
  }

  private cleanupExpiredCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry.expiresAt)) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired context cache entries`);
    }
  }

  async clearAllCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear database cache (all expired entries)
    try {
      const { error } = await supabase
        .from('conversation_context_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error clearing context cache:', error);
      }
    } catch (error) {
      console.error('Error clearing context cache:', error);
    }
  }

  getMemoryCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
    };
  }
}

// Singleton instance
export const contextCacheService = new ContextCacheService();