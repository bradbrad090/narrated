import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SavedConversations } from '@/components/SavedConversations';
import { TextAssistedMode } from '@/components/conversation/TextAssistedMode';
import { VoiceConversationMode } from '@/components/conversation/VoiceConversationMode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sparkles, User, Bot } from 'lucide-react';
import { useConversationState } from '@/hooks/useConversationState';
import { useToast } from '@/hooks/use-toast';
import { ConversationSession } from '@/types/conversation';
import { isFeatureEnabled } from '@/config/environment';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';
import { supabase } from '@/integrations/supabase/client';

interface ConversationInterfaceProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  className?: string;
  isChapterComplete?: boolean;
  onContentGenerated?: (content: string) => void;
  onConversationUpdate?: () => void;
}



export const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  userId,
  bookId,
  chapterId,
  className = "",
  isChapterComplete = false,
  onContentGenerated,
  onConversationUpdate
}) => {
  const [selectedMode, setSelectedMode] = useState('text-assisted');
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const conversationState = useConversationState({
    userId,
    bookId,
    chapterId
  });

  const {
    history: conversationHistory,
    context,
    currentSession,
    ui: { isLoading: stateIsLoading, isTyping: stateIsTyping },
    loadConversationHistory,
    deleteConversation,
    deletingSessionIds,
    endConversation,
    startConversation,
    sendMessage
  } = conversationState;

  // Handle conversation end
  const handleEndConversation = useCallback(async () => {
    try {
      await endConversation();
    } catch (error) {
      // Error already handled in endConversation
    }
  }, [endConversation]);

  // Handle conversation updates (new conversations, deletions, etc.)
  const handleConversationUpdate = useCallback(() => {
    loadConversationHistory();
    if (onConversationUpdate) {
      onConversationUpdate();
    }
  }, [loadConversationHistory, onConversationUpdate]);

  // Save current conversation when chapter changes
  const saveCurrentConversation = useCallback(async () => {
    if (currentSession && currentSession.messages.length > 0) {
      try {
        // Check if conversation has an ID (exists in database)
        const conversationId = (currentSession as any).id;
        
        if (conversationId) {
          // Update existing conversation
          const { error } = await supabase
            .from('chat_histories')
            .update({
              chapter_id: chapterId, // Link to current chapter
              messages: currentSession.messages as any,
              conversation_type: currentSession.conversationType,
              conversation_medium: currentSession.conversationMedium || 'text',
              conversation_goals: (currentSession.goals || []) as any,
              is_self_conversation: false,
              context_snapshot: (currentSession.context || {}) as any,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);

          if (error) throw error;
        } else {
          // Insert new conversation  
          const { error } = await supabase
            .from('chat_histories')
            .insert({
              user_id: userId,
              chapter_id: chapterId, // Link to current chapter
              messages: currentSession.messages as any,
              conversation_type: currentSession.conversationType,
              conversation_medium: currentSession.conversationMedium || 'text',
              conversation_goals: (currentSession.goals || []) as any,
              is_self_conversation: false,
              context_snapshot: (currentSession.context || {}) as any
            });

          if (error) throw error;
        }
        
        console.log('Conversation saved successfully before chapter switch');
      } catch (error) {
        console.error('Failed to save conversation before chapter switch:', error);
      }
    }
  }, [currentSession, userId, chapterId]);

  // Listen for save events from parent component
  useEffect(() => {
    const handleSaveEvent = () => {
      saveCurrentConversation();
    };

    const handleSaveAndEndEvent = async () => {
      console.log('handleSaveAndEndEvent triggered', { currentSession: currentSession?.sessionId, messageCount: currentSession?.messages?.length });
      
      // Early return if no session to save
      if (!currentSession || !currentSession.messages || currentSession.messages.length === 0) {
        console.log('No active conversation session to save');
        return;
      }
      
      try {
        // First save the conversation
        await saveCurrentConversation();
        
        // Then end the conversation and generate summary
        // We need to call endConversation before clearing the session
        await handleEndConversation();
        
        // Update the conversations list to show the newly saved conversation
        handleConversationUpdate();
        
        // Reset to the default tab
        setSelectedMode('text-assisted');
        
        toast({
          title: "Success",
          description: "Conversation submitted and saved successfully"
        });
      } catch (error) {
        console.error('Error in handleSaveAndEndEvent:', error);
        toast({
          title: "Error",
          description: "Failed to submit conversation. Please try again.",
          variant: "destructive"
        });
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('saveCurrentConversation', handleSaveEvent);
      element.addEventListener('saveAndEndConversation', handleSaveAndEndEvent);
      return () => {
        element.removeEventListener('saveCurrentConversation', handleSaveEvent);
        element.removeEventListener('saveAndEndConversation', handleSaveAndEndEvent);
      };
    }
  }, [saveCurrentConversation, handleEndConversation]);

  const getRecommendedMode = () => {
    if (!conversationHistory.length) return 'text-assisted';
    
    const recentTextConversations = conversationHistory
      .filter(s => s.conversationMedium === 'text')
      .slice(0, 3);
    
    if (recentTextConversations.length > 0) {
      return 'text-assisted'; // User has been using text conversations
    }
    
    return 'text-assisted';
  };

  // Quick resume feature removed - users can only view and delete conversations


  return (
    <ErrorBoundary>
      <div 
        ref={containerRef}
        data-conversation-interface
        className={`w-full ${className}`}
      >
        {/* Quick Actions removed - no resume functionality */}

        {/* Tabbed Interface for Starting Conversations */}
        <Tabs value={selectedMode} onValueChange={setSelectedMode} className="w-full">
          <div className="w-full border-b">
            <TabsList className="grid w-full grid-cols-2">
              {isFeatureEnabled('textConversations') && (
                <TabsTrigger value="text-assisted" className="flex items-center gap-2">
                  Text Conversation
                </TabsTrigger>
              )}
              {isFeatureEnabled('voiceConversations') && (
                <TabsTrigger value="voice-to-voice" className="flex items-center gap-2">
                  Spoken Conversation
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Text-Assisted Mode */}
          {isFeatureEnabled('textConversations') && (
            <TabsContent value="text-assisted" className="mt-6">
              <ErrorBoundary>
                <TextAssistedMode
                  userId={userId}
                  bookId={bookId}
                  chapterId={chapterId}
                  context={context}
                  isChapterComplete={isChapterComplete}
                  onConversationSaved={handleConversationUpdate}
                  // Pass conversation state from parent
                  currentSession={currentSession}
                  isLoading={stateIsLoading}
                  isTyping={stateIsTyping}
                  onStartConversation={startConversation}
                  onSendMessage={sendMessage}
                />
              </ErrorBoundary>
            </TabsContent>
          )}

          {/* Voice-to-Voice AI Mode */}
          {isFeatureEnabled('voiceConversations') && (
            <TabsContent value="voice-to-voice" className="mt-6">
              <ErrorBoundary>
                <VoiceConversationMode
                  userId={userId}
                  bookId={bookId}
                  chapterId={chapterId}
                  context={context}
                  isChapterComplete={isChapterComplete}
                  onConversationUpdate={handleConversationUpdate}
                  // Pass conversation state from parent
                  currentSession={currentSession}
                />
              </ErrorBoundary>
            </TabsContent>
          )}
         </Tabs>


      </div>
    </ErrorBoundary>
  );
};