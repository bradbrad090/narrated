import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ConversationCard } from '@/components/ConversationCard';
import { ConversationSession } from '@/types/conversation';
import { Search, Archive, User, Bot, Mic } from 'lucide-react';

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

  // Filter conversations based on search and filter
  const filteredConversations = conversations.filter(session => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      session.messages.some(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      session.conversationType.toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter
    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'self' && session.isSelfConversation) ||
      (selectedFilter === 'text' && !session.isSelfConversation && session.conversationMedium === 'text') ||
      (selectedFilter === 'voice' && !session.isSelfConversation && session.conversationMedium === 'voice');

    return matchesSearch && matchesFilter;
  });

  // Group conversations by type for statistics
  const conversationStats = {
    total: conversations.length,
    self: conversations.filter(s => s.isSelfConversation).length,
    textChat: conversations.filter(s => !s.isSelfConversation && s.conversationMedium === 'text').length,
    voiceChat: conversations.filter(s => !s.isSelfConversation && s.conversationMedium === 'voice').length
  };

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

        {/* Filter Tabs */}
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
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No conversations match your search</p>
                  </div>
                ) : (
                  filteredConversations
                    .sort((a, b) => {
                      const dateA = new Date(a.messages[0]?.timestamp || 0).getTime();
                      const dateB = new Date(b.messages[0]?.timestamp || 0).getTime();
                      return dateB - dateA; // Most recent first
                    })
                    .map((session) => (
                      <ConversationCard
                        key={session.sessionId}
                        session={session}
                        onResume={onResumeConversation}
                        onView={onViewConversation}
                      />
                    ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};