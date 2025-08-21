import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VoiceInterface from '@/components/VoiceInterface';
import { useConversationState } from '@/hooks/useConversationState';
import { Bot } from 'lucide-react';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';

interface VoiceConversationModeProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  context?: any;
  onConversationUpdate?: () => void;
  className?: string;
}

export const VoiceConversationMode: React.FC<VoiceConversationModeProps> = ({
  userId,
  bookId,
  chapterId,
  context,
  onConversationUpdate,
  className = ""
}) => {
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  
  const {
    loadConversationHistory
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

  const handleConversationUpdate = () => {
    loadConversationHistory();
    
    if (onConversationUpdate) {
      onConversationUpdate();
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Voice-to-Voice AI Conversation
          {isAISpeaking && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              AI Speaking
            </div>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Have a real-time voice conversation with the AI assistant
        </p>
      </CardHeader>
      <CardContent>
        <div className="p-6 bg-muted/30 rounded-lg text-center">
          <VoiceInterface 
            onSpeakingChange={setIsAISpeaking}
            context={context}
            conversationType="interview"
            userId={userId}
            bookId={bookId}
            chapterId={chapterId}
            onConversationUpdate={handleConversationUpdate}
          />
        </div>
      </CardContent>
    </Card>
  );
};