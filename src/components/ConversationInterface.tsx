import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

  const {
    history: conversationHistory,
    context,
    resumeConversation,
    loadConversationHistory
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });


  return (
    <ErrorBoundary>
      <div className={`w-full ${className}`}>
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