import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ConversationCard } from '@/components/ConversationCard';
import { ConversationSession } from '@/types/conversation';

interface VirtualizedConversationListProps {
  conversations: ConversationSession[];
  onDeleteConversation?: (session: ConversationSession) => void;
  deletingSessionIds?: Set<string>;
  height: number;
  itemHeight?: number;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    conversations: ConversationSession[];
    onDeleteConversation?: (session: ConversationSession) => void;
    deletingSessionIds?: Set<string>;
  };
}

const ListItem = memo(({ index, style, data }: ListItemProps) => {
  const { 
    conversations, 
    onDeleteConversation,
    deletingSessionIds = new Set()
  } = data;
  const session = conversations[index];

  if (!session) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="px-2 py-1">
      <ConversationCard
        session={session}
        onDelete={onDeleteConversation}
        isDeleting={deletingSessionIds.has(session.sessionId)}
      />
    </div>
  );
});

ListItem.displayName = 'ListItem';

export const VirtualizedConversationList = memo<VirtualizedConversationListProps>(({
  conversations,
  onDeleteConversation,
  deletingSessionIds = new Set(),
  height,
  itemHeight = 120
}) => {
  const itemData = useMemo(() => ({
    conversations,
    onDeleteConversation,
    deletingSessionIds
  }), [conversations, onDeleteConversation, deletingSessionIds]);

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