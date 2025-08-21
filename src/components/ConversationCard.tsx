import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Mic, User, Bot, Calendar, MessageSquare } from 'lucide-react';
import { ConversationSession } from '@/types/conversation';

interface ConversationCardProps {
  session: ConversationSession;
  onResume?: (session: ConversationSession) => void;
  onView?: (session: ConversationSession) => void;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  session,
  onResume,
  onView
}) => {
  const getConversationIcon = () => {
    if (session.isSelfConversation) {
      return <User className="h-4 w-4" />;
    }
    return session.conversationMedium === 'voice' ? <Mic className="h-4 w-4" /> : <Bot className="h-4 w-4" />;
  };

  const getConversationTypeLabel = () => {
    if (session.isSelfConversation) {
      return 'Self Reflection';
    }
    return `${session.conversationType.charAt(0).toUpperCase() + session.conversationType.slice(1)} Chat`;
  };

  const getMediumBadge = () => {
    if (session.isSelfConversation) {
      return (
        <Badge variant="secondary" className="text-xs">
          {session.conversationMedium === 'voice' ? '🎤' : '💭'} Self
        </Badge>
      );
    }
    
    return (
      <Badge 
        variant={session.conversationMedium === 'voice' ? 'default' : 'secondary'}
        className="text-xs"
      >
        {session.conversationMedium === 'voice' ? '🎤 Voice' : '💬 Text'}
      </Badge>
    );
  };

  const getPreviewText = () => {
    if (session.messages.length === 0) return 'Empty conversation';
    
    const firstMessage = session.messages[0];
    const preview = firstMessage.content.substring(0, 100);
    return preview.length < firstMessage.content.length ? `${preview}...` : preview;
  };

  const getConversationStats = () => {
    const messageCount = session.messages.length;
    const wordCount = session.messages.reduce((count, msg) => {
      return count + msg.content.split(' ').length;
    }, 0);

    return { messageCount, wordCount };
  };

  const { messageCount, wordCount } = getConversationStats();
  const conversationDate = new Date(session.messages[0]?.timestamp || Date.now());

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              {getConversationIcon()}
              <span className="font-medium text-sm">{getConversationTypeLabel()}</span>
              {getMediumBadge()}
            </div>

            {/* Preview Text */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {getPreviewText()}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {conversationDate.toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {messageCount} {messageCount === 1 ? 'message' : 'messages'}
              </div>
              <div>
                ~{wordCount} words
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {session.isSelfConversation || session.conversationMedium === 'voice' ? (
              <Button
                onClick={() => onView?.(session)}
                size="sm"
                variant="outline"
                className="text-xs h-7"
              >
                View
              </Button>
            ) : (
              <Button
                onClick={() => onResume?.(session)}
                size="sm"
                variant="outline"
                className="text-xs h-7"
              >
                Resume
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};