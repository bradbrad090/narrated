import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SavedConversations } from '@/components/SavedConversations';
import { SelfConversationMode } from '@/components/conversation/SelfConversationMode';
import { TextAssistedMode } from '@/components/conversation/TextAssistedMode';
import { VoiceConversationMode } from '@/components/conversation/VoiceConversationMode';
import { Sparkles, User, Bot } from 'lucide-react';
import { useConversationFlow } from '@/hooks/useConversationFlow';
import { useToast } from '@/hooks/use-toast';

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
    conversationHistory,
    context,
    resumeConversation,
    loadConversationHistory
  } = useConversationFlow(userId, bookId, chapterId);


  return (
    <div className={`w-full ${className}`}>
      {/* Tabbed Interface for Starting Conversations */}
      <Tabs value={selectedMode} onValueChange={setSelectedMode} className="w-full">
        <div className="w-full border-b">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="self" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Self Conversation
            </TabsTrigger>
            <TabsTrigger value="text-assisted" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Text-Assisted
            </TabsTrigger>
            <TabsTrigger value="voice-to-voice" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Voice-to-Voice AI
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Self Conversation Mode */}
        <TabsContent value="self" className="mt-6">
          <SelfConversationMode
            userId={userId}
            bookId={bookId}
            chapterId={chapterId}
            context={context}
            onConversationSaved={loadConversationHistory}
          />
        </TabsContent>

        {/* Text-Assisted Mode */}
        <TabsContent value="text-assisted" className="mt-6">
          <TextAssistedMode
            userId={userId}
            bookId={bookId}
            chapterId={chapterId}
            context={context}
          />
        </TabsContent>

        {/* Voice-to-Voice AI Mode */}
        <TabsContent value="voice-to-voice" className="mt-6">
          <VoiceConversationMode
            userId={userId}
            bookId={bookId}
            chapterId={chapterId}
            context={context}
            onConversationUpdate={loadConversationHistory}
          />
        </TabsContent>
      </Tabs>

      {/* Saved Conversations */}
      <SavedConversations 
        conversations={conversationHistory}
        onResumeConversation={resumeConversation}
        onViewConversation={(session) => {
          // For now, just resume - could add a dedicated view modal later
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
    </div>
  );
};