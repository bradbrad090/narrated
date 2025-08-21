import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ConversationCard } from '@/components/ConversationCard';
import { VirtualizedConversationList } from '@/components/VirtualizedConversationList';
import { ConversationSession } from '@/types/conversation';
import { Search, Archive, User, Bot, Mic } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useOptimizedConversationList, useConversationStats } from '@/hooks/usePerformanceOptimizations';
import { config, isFeatureEnabled, getPerformanceSetting } from '@/config/environment';

interface SavedConversationsProps {
  conversations: ConversationSession[];
  onResumeConversation?: (session: ConversationSession) => void;
  onViewConversation?: (session: ConversationSession) => void;
  className?: string;
}

export const SavedConversations: React.FC<SavedConversationsProps> = ({
  conversations,
  onResumeConversation,
  onViewConversation,
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Performance optimizations
  const debouncedSearchQuery = useDebounce(searchQuery, getPerformanceSetting('debounceDelay'));
  const filteredConversations = useOptimizedConversationList(
    conversations, 
    debouncedSearchQuery, 
    selectedFilter
  );
  const conversationStats = useConversationStats(conversations);

  // Determine whether to use virtualization
  const useVirtualization = filteredConversations.length > getPerformanceSetting('virtualScrollThreshold');
  const virtualListHeight = 500;

  if (conversations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Saved Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No saved conversations yet</p>
            <p className="text-sm">Start a conversation to see it saved here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Saved Conversations
          <span className="text-sm font-normal text-muted-foreground">
            ({conversationStats.total})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={selectedFilter} onValueChange={setSelectedFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All ({conversationStats.total})
            </TabsTrigger>
            <TabsTrigger value="self" className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              Self ({conversationStats.self})
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Text ({conversationStats.textChat})
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs flex items-center gap-1">
              <Mic className="h-3 w-3" />
              Voice ({conversationStats.voiceChat})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedFilter} className="mt-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No conversations match your search</p>
              </div>
            ) : useVirtualization ? (
              <VirtualizedConversationList
                conversations={filteredConversations}
                onResumeConversation={onResumeConversation}
                onViewConversation={onViewConversation}
                height={virtualListHeight}
              />
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredConversations.map((session) => (
                    <ConversationCard
                      key={session.sessionId}
                      session={session}
                      onResume={onResumeConversation}
                      onView={onViewConversation}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};