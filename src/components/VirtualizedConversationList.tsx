import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ConversationCard } from '@/components/ConversationCard';
import { ConversationSession } from '@/types/conversation';

interface VirtualizedConversationListProps {
  conversations: ConversationSession[];
  onResumeConversation?: (session: ConversationSession) => void;
  onViewConversation?: (session: ConversationSession) => void;
  height: number;
  itemHeight?: number;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    conversations: ConversationSession[];
    onResumeConversation?: (session: ConversationSession) => void;
    onViewConversation?: (session: ConversationSession) => void;
  };
}

const ListItem = memo(({ index, style, data }: ListItemProps) => {
  const { conversations, onResumeConversation, onViewConversation } = data;
  const session = conversations[index];

  if (!session) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="px-2 py-1">
      <ConversationCard
        session={session}
        onResume={onResumeConversation}
        onView={onViewConversation}
      />
    </div>
  );
});

ListItem.displayName = 'ListItem';

export const VirtualizedConversationList = memo<VirtualizedConversationListProps>(({
  conversations,
  onResumeConversation,
  onViewConversation,
  height,
  itemHeight = 120
}) => {
  const itemData = useMemo(() => ({
    conversations,
    onResumeConversation,
    onViewConversation
  }), [conversations, onResumeConversation, onViewConversation]);

  if (conversations.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No conversations to display
      </div>
    );
  }

  return (
    <List
      height={height}
      width="100%"
      itemCount={conversations.length}
      itemSize={itemHeight}
      itemData={itemData}
      overscanCount={5}
    >
      {ListItem}
    </List>
  );
});

VirtualizedConversationList.displayName = 'VirtualizedConversationList';