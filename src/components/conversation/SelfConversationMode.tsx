import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleVoiceTranscription = (text: string) => {
    setCurrentMessage(prev => prev + (prev ? ' ' : '') + text);
  };

  const handleError = (error: any, context: string) => {
    const conversationError = createConversationError(
      ConversationErrorType.NETWORK,
      `${context}: ${error.message || 'Unknown error occurred'}`,
      true,
      error
    );

    console.error(`Self conversation error in ${context}:`, conversationError);
    
    toast({
      title: "Error saving entry",
      description: conversationError.message,
      variant: "destructive",
    });
  };

  const handleSaveSelfConversation = async () => {
    if (!currentMessage.trim() || !userId || !bookId) {
      const error = createConversationError(
        ConversationErrorType.VALIDATION,
        "Message content, User ID, and Book ID are required",
        false
      );
      handleError(error, 'validation');
      return;
    }

    setIsLoading(true);

    try {
      // Generate unique session ID for self conversation
      const sessionId = `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const selfConversationEntry = {
        role: 'user' as const,
        content: currentMessage.trim(),
        timestamp: new Date().toISOString()
      };

      // Save to chat_histories table
      const { error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: userId,
          chapter_id: chapterId,
          session_id: sessionId,
          conversation_type: 'reflection',
          conversation_medium: 'text',
          is_self_conversation: true,
          messages: [selfConversationEntry],
          context_snapshot: context || {},
          conversation_goals: [
            'Document personal thoughts and reflections',
            'Capture self-directed memories and experiences',
            'Preserve authentic personal voice and perspective'
          ]
        });

      if (error) {
        throw error;
      }

      // Notify parent component
      if (onConversationSaved) {
        onConversationSaved();
      }
      
      toast({
        title: CONVERSATION_CONFIG.MESSAGES.ENTRY_SAVED,
        description: "Your self conversation entry has been saved to your history.",
      });
      
      setCurrentMessage('');
      textareaRef.current?.focus();

    } catch (error: any) {
      handleError(error, 'database operation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Self Conversation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Write your thoughts and memories using text or voice input
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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