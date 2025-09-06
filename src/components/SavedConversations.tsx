import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConversationSession } from '@/types/conversation';
import { VirtualizedConversationList } from '@/components/VirtualizedConversationList';
import { ConversationCard } from '@/components/ConversationCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquare, User, Mic, Calendar, Archive } from 'lucide-react';
import { useOptimizedConversationList, useConversationStats } from '@/hooks/usePerformanceOptimizations';

interface SavedConversationsProps {
  conversations: ConversationSession[];
  onViewConversation?: (session: ConversationSession) => void;
  onDeleteConversation?: (session: ConversationSession) => void;
  deletingSessionIds?: Set<string>;
  className?: string;
}

export const SavedConversations: React.FC<SavedConversationsProps> = ({
  conversations,
  onViewConversation,
  onDeleteConversation,
  deletingSessionIds = new Set(),
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Use optimized conversation filtering and stats
  const filteredConversations = useOptimizedConversationList(
    conversations, 
    searchQuery, 
    selectedFilter
  );
  
  const conversationStats = useConversationStats(conversations);

  // Memoize handlers to prevent unnecessary re-renders
  const handleViewConversation = useCallback((session: ConversationSession) => {
    onViewConversation?.(session);
  }, [onViewConversation]);

  const handleDeleteConversation = useCallback((session: ConversationSession) => {
    onDeleteConversation?.(session);
  }, [onDeleteConversation]);

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

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter conversations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({conversationStats.total})</SelectItem>
              <SelectItem value="self">Self ({conversationStats.self})</SelectItem>
              <SelectItem value="text">Text Chat ({conversationStats.textChat})</SelectItem>
              <SelectItem value="voice">Voice Chat ({conversationStats.voiceChat})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Statistics */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {conversationStats.total} Total
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {conversationStats.self} Self
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {conversationStats.textChat} Text Chat
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Mic className="h-3 w-3" />
            {conversationStats.voiceChat} Voice Chat
          </Badge>
        </div>

        {/* Conversation List */}
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No conversations match your search</p>
          </div>
        ) : filteredConversations.length > 20 ? (
          <VirtualizedConversationList
            conversations={filteredConversations}
            onViewConversation={handleViewConversation}
            onDeleteConversation={handleDeleteConversation}
            deletingSessionIds={deletingSessionIds}
            height={400}
          />
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredConversations.map((session) => (
                <ConversationCard
                  key={session.sessionId}
                  session={session}
                  onView={handleViewConversation}
                  onDelete={handleDeleteConversation}
                  isDeleting={deletingSessionIds.has(session.sessionId)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};