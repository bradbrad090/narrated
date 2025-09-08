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
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  console.log('ConversationInterface state:', { 
    showSummary, 
    summary: summary?.substring(0, 50) + '...', 
    loadingSummary,
    selectedMode 
  });

  const {
    history: conversationHistory,
    context,
    currentSession,
    loadConversationHistory,
    deleteConversation,
    deletingSessionIds,
    endConversation,
    submitConversation,
    submitted
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

  // Handle conversation end with summary fetch
  const handleEndConversation = useCallback(async () => {
    console.log('🟣 handleEndConversation started', { loadingSummary });
    setLoadingSummary(true);
    try {
      console.log('🟣 Calling endConversation...');
      const summaryResult = await endConversation();
      console.log('🟣 endConversation result:', { summaryResult, length: summaryResult?.length });
      
      if (summaryResult) {
        const truncatedSummary = summaryResult.length > 300 ? `${summaryResult.slice(0, 300)}...` : summaryResult;
        console.log('🟣 Setting summary and showSummary=true', { truncatedSummary });
        setSummary(truncatedSummary);
        setShowSummary(true);
      } else {
        console.log('🟣 No summary result received');
      }
    } catch (error) {
      console.error('🔴 Error in handleEndConversation:', error);
      // Error already handled in endConversation
    } finally {
      console.log('🟣 Setting loadingSummary=false');
      setLoadingSummary(false);
    }
  }, [endConversation]);

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
      console.log('🟡 handleSaveEvent triggered');
      saveCurrentConversation();
    };

    const handleSaveAndEndEvent = async () => {
      console.log('🟢 handleSaveAndEndEvent triggered', { currentSession, hasMessages: currentSession?.messages?.length });
      
      // First save the conversation
      console.log('🟢 Starting saveCurrentConversation...');
      await saveCurrentConversation();
      console.log('🟢 saveCurrentConversation completed');
      
      // Then end the conversation and generate summary
      // We need to call endConversation before clearing the session
      console.log('🟢 Starting handleEndConversation...');
      await handleEndConversation();
      console.log('🟢 handleEndConversation completed');
      
      // Reset to the default tab
      console.log('🟢 Resetting to self mode');
      setSelectedMode('self');
    };

    const element = containerRef.current;
    console.log('🔧 Setting up event listeners', { element, hasElement: !!element });
    
    if (element) {
      element.addEventListener('saveCurrentConversation', handleSaveEvent);
      element.addEventListener('saveAndEndConversation', handleSaveAndEndEvent);
      console.log('🔧 Event listeners added successfully');
      
      return () => {
        console.log('🔧 Cleaning up event listeners');
        element.removeEventListener('saveCurrentConversation', handleSaveEvent);
        element.removeEventListener('saveAndEndConversation', handleSaveAndEndEvent);
      };
    } else {
      console.error('🔴 No container element found for event listeners');
    }
  }, [saveCurrentConversation, handleEndConversation]);

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

        {/* Auto-generated Summary Display */}
        {showSummary && (
          <div className="p-4 bg-card rounded-lg border mt-6">
            <h2 className="text-lg font-semibold mb-2">Chapter Summary</h2>
            <p className="text-sm text-muted-foreground mb-2">{summary}</p>
            <p className="text-xs text-muted-foreground mb-2">
              The AI has crafted your full chapter behind the scenes.
            </p>
            
            {/* Submission Controls */}
            {!submitted ? (
              <button 
                onClick={() => {
                  console.log('Submit button clicked!');
                  submitConversation();
                }}
                disabled={loadingSummary}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded mt-2 disabled:opacity-50"
              >
                {loadingSummary ? "Processing..." : "Confirm & Submit"}
              </button>
            ) : (
              <div className="mt-2 text-green-600 font-medium">
                ✓ Submitted! PDF generating...
              </div>
            )}
          </div>
        )}
        
        {/* Debug info */}
        <div className="mt-2 text-xs text-gray-500">
          Debug: showSummary={String(showSummary)}, submitted={String(submitted)}, summary length={summary?.length || 0}
        </div>

      </div>
    </ErrorBoundary>
  );
};