import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SavedConversations } from '@/components/SavedConversations';
import { SelfConversationMode } from '@/components/conversation/SelfConversationMode';
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
  onContentGenerated?: (content: string) => void;
}



export const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  userId,
  bookId,
  chapterId,
  className = "",
  onContentGenerated
}) => {
  const [selectedMode, setSelectedMode] = useState('self');
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    history: conversationHistory,
    context,
    currentSession,
    loadConversationHistory,
    deleteConversation,
    deletingSessionIds,
    endConversation
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

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
              is_self_conversation: currentSession.isSelfConversation || false,
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
              is_self_conversation: currentSession.isSelfConversation || false,
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

    const handleSaveAndEndEvent = () => {
      saveCurrentConversation();
      // End the current conversation and reset to start state
      endConversation();
      // Reset to the default tab
      setSelectedMode('self');
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
  }, [saveCurrentConversation, endConversation]);

  const getRecommendedMode = () => {
    if (!conversationHistory.length) return 'self';
    
    const recentTextConversations = conversationHistory
      .filter(s => s.conversationMedium === 'text' && !s.isSelfConversation)
      .slice(0, 3);
    
    if (recentTextConversations.length > 0) {
      return 'text-assisted'; // User has been using text conversations
    }
    
    return 'self';
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
            <TabsList className="grid w-full grid-cols-3">
              {isFeatureEnabled('selfConversations') && (
                <TabsTrigger value="self" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Self Conversation
                </TabsTrigger>
              )}
              {isFeatureEnabled('textConversations') && (
                <TabsTrigger value="text-assisted" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Text-Assisted
                </TabsTrigger>
              )}
              {isFeatureEnabled('voiceConversations') && (
                <TabsTrigger value="voice-to-voice" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Voice-to-Voice AI
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Self Conversation Mode */}
          {isFeatureEnabled('selfConversations') && (
            <TabsContent value="self" className="mt-6">
              <ErrorBoundary>
                <SelfConversationMode
                  userId={userId}
                  bookId={bookId}
                  chapterId={chapterId}
                  context={context}
                  onConversationSaved={loadConversationHistory}
                />
              </ErrorBoundary>
            </TabsContent>
          )}

          {/* Text-Assisted Mode */}
          {isFeatureEnabled('textConversations') && (
            <TabsContent value="text-assisted" className="mt-6">
              <ErrorBoundary>
                <TextAssistedMode
                  userId={userId}
                  bookId={bookId}
                  chapterId={chapterId}
                  context={context}
                  onConversationSaved={loadConversationHistory}
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
                  onConversationUpdate={loadConversationHistory}
                />
              </ErrorBoundary>
            </TabsContent>
          )}
        </Tabs>

        {/* Saved Conversations */}
        {isFeatureEnabled('conversationHistory') && (
          <ErrorBoundary>
            <SavedConversations 
              conversations={conversationHistory}
              onDeleteConversation={deleteConversation}
              deletingSessionIds={deletingSessionIds}
              className="mt-6"
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
};