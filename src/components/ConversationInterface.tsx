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
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoShowSummary, setAutoShowSummary] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    history: conversationHistory,
    context,
    currentSession,
    loadConversationHistory,
    deleteConversation,
    deletingSessionIds,
    endConversation,
    submitConversation
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

  // Handle conversation end with summary fetch
  const handleEndConversation = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const summaryResult = await endConversation();
      if (summaryResult) {
        setSummary(summaryResult.length > 300 ? `${summaryResult.slice(0, 300)}...` : summaryResult);
        setShowSummary(true);
      }
    } catch (error) {
      // Error already handled in endConversation
    } finally {
      setLoadingSummary(false);
    }
  }, [endConversation]);

  // Generate summary from existing conversations
  const generateSummaryFromHistory = useCallback(async () => {
    if (!chapterId || conversationHistory.length === 0) return;
    
    setLoadingSummary(true);
    try {
      // Get the most recent conversation with messages
      const recentConversation = conversationHistory.find(conv => conv.messages && conv.messages.length > 0);
      
      if (recentConversation) {
        const { data: generationData, error: generationError } = await supabase.functions.invoke('generate-summary', {
          body: {
            userId,
            bookId,
            chapterId,
            conversationHistory: recentConversation.messages
          }
        });

        if (generationError) {
          console.error('Summary generation error:', generationError);
          setSummary("Based on your conversations, we'll generate a comprehensive chapter for your autobiography.");
        } else if (generationData?.success && generationData?.summary) {
          setSummary(generationData.summary.length > 300 ? `${generationData.summary.slice(0, 300)}...` : generationData.summary);
        } else {
          setSummary("Based on your conversations, we'll generate a comprehensive chapter for your autobiography.");
        }
      } else {
        setSummary("Based on your conversations, we'll generate a comprehensive chapter for your autobiography.");
      }
      
      setAutoShowSummary(true);
    } catch (error) {
      console.error('Failed to generate summary from history:', error);
      setSummary("Based on your conversations, we'll generate a comprehensive chapter for your autobiography.");
      setAutoShowSummary(true);
    } finally {
      setLoadingSummary(false);
    }
  }, [chapterId, conversationHistory, userId, bookId]);

  // Handle submit for PDF generation
  const handleSubmit = useCallback(async () => {
    if (!chapterId || submitting || submitted) return;
    
    setSubmitting(true);
    try {
      await submitConversation();
      setSubmitted(true);
      setShowSummary(false);
      setAutoShowSummary(false); // Hide auto summary after submission
      toast({
        title: "Submitted for PDF generation",
        description: "Your chapter is being processed...",
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [chapterId, submitting, submitted, submitConversation, toast]);

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

  // Auto-show submit button when conversations exist
  useEffect(() => {
    if (chapterId && conversationHistory.length > 0 && !submitted && !autoShowSummary && !showSummary) {
      generateSummaryFromHistory();
    }
  }, [chapterId, conversationHistory.length, submitted, autoShowSummary, showSummary, generateSummaryFromHistory]);

  // Listen for save events from parent component
  useEffect(() => {
    const handleSaveEvent = () => {
      saveCurrentConversation();
    };

    const handleSaveAndEndEvent = async () => {
      console.log('handleSaveAndEndEvent triggered', { currentSession });
      
      // First save the conversation
      await saveCurrentConversation();
      
      // Then end the conversation and generate summary
      // We need to call endConversation before clearing the session
      await handleEndConversation();
      
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
        {(showSummary || autoShowSummary) && !submitted && (
          <div className="p-4 bg-card rounded-lg border mt-6">
            <h2 className="text-lg font-semibold mb-2">Chapter Summary</h2>
            {loadingSummary ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Generating summary...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Looking at the code, this interface is the Chapter Summary section within the ConversationInterface component. Specifically, it's the section that renders when (showSummary || autoShowSummary) && !submitted is true.

                  In the code, this section is labeled with the comment:

                  {/* Auto-generated Summary Display */}
                  It's part of the ConversationInterface component located in src/components/ConversationInterface.tsx, around lines 326-353. The component itself doesn't have a separate name - it's just a conditional JSX block within the main ConversationInterface component that displays the chapter summary and submit button.
                </p>
                <div className="flex justify-center">
                  <Button 
                    onClick={handleSubmit}
                    disabled={submitting || submitted || loadingSummary}
                    className="px-6 py-2"
                  >
                    {submitting ? 'Submitting...' : 'Confirm and Submit for PDF'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Submission Status */}
        {submitted && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mt-6 text-center">
            <p className="text-green-800 font-medium">PDF Generation in Progress</p>
            <p className="text-sm text-green-600 mt-1">
              Your chapter has been submitted and is being processed into a PDF.
            </p>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
};