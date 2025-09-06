import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SavedConversations } from '@/components/SavedConversations';
import { SelfConversationMode } from '@/components/conversation/SelfConversationMode';
import { TextAssistedMode } from '@/components/conversation/TextAssistedMode';
import { VoiceConversationMode } from '@/components/conversation/VoiceConversationMode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sparkles, User, Bot, RotateCcw } from 'lucide-react';
import { useConversationState } from '@/hooks/useConversationState';
import { useToast } from '@/hooks/use-toast';
import { ConversationSession } from '@/types/conversation';
import { isFeatureEnabled } from '@/config/environment';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';

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
  const [showQuickResume, setShowQuickResume] = useState(false);
  const { toast } = useToast();

  const {
    history: conversationHistory,
    context,
    currentSession,
    resumeConversation,
    loadConversationHistory,
    hasActiveSession
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

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

  // Quick resume feature
  const getResumableSession = (): ConversationSession | null => {
    return conversationHistory.find(session => 
      !session.isSelfConversation && 
      session.conversationMedium === 'text' &&
      session.messages.length > 1 && 
      session.messages.length < 20 // Not too long
    ) || null;
  };

  useEffect(() => {
    const resumableSession = getResumableSession();
    setShowQuickResume(!!resumableSession && !hasActiveSession);
  }, [conversationHistory, hasActiveSession]);

  const handleQuickResume = () => {
    const resumableSession = getResumableSession();
    if (resumableSession) {
      resumeConversation(resumableSession);
      setSelectedMode('text-assisted');
      setShowQuickResume(false);
      toast({
        title: CONVERSATION_CONFIG.MESSAGES.CONVERSATION_RESUMED,
        description: "Continuing where you left off",
      });
    }
  };


  return (
    <ErrorBoundary>
      <div className={`w-full ${className}`}>
        {/* Quick Actions */}
        {showQuickResume && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Continue your conversation</span>
                <Badge variant="secondary" className="text-xs">
                  {getResumableSession()?.messages.length || 0} messages
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleQuickResume}
                  size="sm"
                  className="h-7"
                >
                  Resume
                </Button>
                <Button
                  onClick={() => setShowQuickResume(false)}
                  variant="outline"
                  size="sm"
                  className="h-7"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

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
              onResumeConversation={(session: ConversationSession) => {
                resumeConversation(session);
              }}
              onViewConversation={(session: ConversationSession) => {
                if (!session.isSelfConversation && session.conversationMedium === 'text') {
                  resumeConversation(session);
                } else {
                  toast({
                    title: "View Conversation",
                    description: "Detailed conversation viewer coming soon!",
                  });
                }
              }}
              className="mt-6"
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
};