import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VoiceInterface from '@/components/VoiceInterface';
import { useConversationState } from '@/hooks/useConversationState';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';

interface VoiceConversationModeProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  context?: any;
  isChapterComplete?: boolean;
  onConversationUpdate?: () => void;
  className?: string;
  currentSession?: any;
}

export const VoiceConversationMode: React.FC<VoiceConversationModeProps> = ({
  userId,
  bookId,
  chapterId,
  context,
  isChapterComplete = false,
  onConversationUpdate,
  className = "",
  currentSession
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
    <Card className={`w-full min-h-[320px] ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Spoken Conversation
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
        <VoiceInterface 
          onSpeakingChange={setIsAISpeaking}
          context={context}
          
          userId={userId}
          bookId={bookId}
          chapterId={chapterId}
          isDisabled={isChapterComplete}
          onConversationUpdate={handleConversationUpdate}
        />
      </CardContent>
    </Card>
  );
};