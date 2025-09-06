import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useConversationState } from '@/hooks/useConversationState';
import { User } from 'lucide-react';
import { 
  ConversationErrorType, 
  createConversationError, 
  CONVERSATION_CONFIG 
} from '@/config/conversationConfig';

interface SelfConversationModeProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  context?: any;
  onConversationSaved?: () => void;
  className?: string;
}

export const SelfConversationMode: React.FC<SelfConversationModeProps> = ({
  userId,
  bookId,
  chapterId,
  context,
  onConversationSaved,
  className = ""
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    ui: { isLoading },
    startSelfConversation
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

  const handleVoiceTranscription = (text: string) => {
    setCurrentMessage(prev => prev + (prev ? ' ' : '') + text);
  };

  const handleSaveSelfConversation = async () => {
    if (!currentMessage.trim() || !userId || !bookId) {
      return;
    }

    try {
      // Use the dedicated self conversation function
      await startSelfConversation(currentMessage.trim());
      
      // Clear the input
      setCurrentMessage('');
      textareaRef.current?.focus();
      
      // Notify parent component
      if (onConversationSaved) {
        onConversationSaved();
      }
    } catch (error: any) {
      console.error('Error saving self conversation:', error);
    }
  };

  return (
    <Card className={`w-full min-h-[320px] ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Self Conversation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Write your thoughts and memories using text or voice input
        </p>
      </CardHeader>
      <CardContent className="space-y-4 py-6 px-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Write your thoughts, memories, or experiences..."
              className="min-h-[120px] resize-none"
              aria-label="Self conversation input"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSaveSelfConversation}
              disabled={!currentMessage.trim() || isLoading}
              className="min-w-[120px]"
              aria-label="Save story entry"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                CONVERSATION_CONFIG.BUTTON_TEXT.SAVE_STORY
              )}
            </Button>
            <VoiceRecorder
              onTranscription={handleVoiceTranscription}
              disabled={isLoading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};