import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import VoiceInterface from '@/components/VoiceInterface';
import { MessageCircle, Send, Mic, MicOff, Loader2, Sparkles, User, Bot } from 'lucide-react';
import { useConversationFlow, ConversationMessage } from '@/hooks/useConversationFlow';
import { useToast } from '@/hooks/use-toast';
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
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [selectedMode, setSelectedMode] = useState('self');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const {
    currentSession,
    conversationHistory,
    context,
    isLoading,
    isTyping,
    startConversation,
    sendMessage,
    endConversation,
    resumeConversation,
    saveDraft,
    loadDraft,
    clearDraft,
    loadConversationHistory
  } = useConversationFlow(userId, bookId, chapterId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isTyping]);

  // Load draft on session start
  useEffect(() => {
    if (currentSession) {
      const draft = loadDraft();
      setCurrentMessage(draft);
    }
  }, [currentSession, loadDraft]);

  // Save draft as user types
  useEffect(() => {
    if (currentMessage && currentSession) {
      const timeoutId = setTimeout(() => {
        saveDraft(currentMessage);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentMessage, currentSession, saveDraft]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !currentSession) return;

    await sendMessage(currentMessage);
    setCurrentMessage('');
    clearDraft();
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setCurrentMessage(prev => prev + (prev ? ' ' : '') + text);
  };

  const handleSaveSelfConversation = async () => {
    if (!currentMessage.trim() || !userId || !bookId) return;

    try {
      // Generate unique session ID for self conversation
      const sessionId = `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const selfConversationEntry = {
        role: 'user' as const,
        content: currentMessage.trim(),
        timestamp: new Date().toISOString()
      };

      // Default to text medium for self conversations
      const conversationMedium = 'text';

      // Save to chat_histories table
      const { error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: userId,
          chapter_id: chapterId,
          session_id: sessionId,
          conversation_type: 'reflection',
          conversation_medium: conversationMedium,
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

      // Refresh conversation history to show the new entry
      await loadConversationHistory();
      
      toast({
        title: "Entry saved",
        description: "Your self conversation entry has been saved to your history.",
      });
      
      setCurrentMessage('');
    } catch (error: any) {
      console.error('Error saving self conversation:', error);
      toast({
        title: "Error saving entry",
        description: error.message || "Failed to save your entry. Please try again.",
        variant: "destructive",
      });
    }
  };


  const formatMessage = (content: string) => {
    // Simple formatting for better readability
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

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
          <Card className="w-full">
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
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSaveSelfConversation}
                    disabled={!currentMessage.trim()}
                    size="icon"
                    aria-label="Save entry"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <VoiceRecorder
                    onTranscription={handleVoiceTranscription}
                    disabled={false}
                  />
                </div>
              </div>


              {/* Display recent self conversation entries */}
              {conversationHistory.filter(session => session.isSelfConversation).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Recent Self Entries</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {conversationHistory
                        .filter(session => session.isSelfConversation)
                        .slice(0, 3)
                        .map((session) => (
                          <div key={session.sessionId} className="p-3 border rounded-lg text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">
                                {new Date(session.messages[0]?.timestamp).toLocaleDateString()}
                              </Badge>
                              <Badge 
                                variant={session.conversationMedium === 'voice' ? 'default' : 'secondary'}
                              >
                                {session.conversationMedium === 'voice' ? '🎤' : '💬'}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">
                              {session.messages[0]?.content || 'Empty entry'}
                            </p>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text-Assisted Mode */}
        <TabsContent value="text-assisted" className="mt-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Text-Assisted Conversation
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Have a text conversation with AI to develop your story
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentSession ? (
                <div className="text-center py-8">
                  <Button
                    onClick={() => startConversation('interview')}
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <MessageCircle className="h-5 w-5 mr-2" />
                    )}
                    Start Conversation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Messages Display */}
                  <ScrollArea className="h-[400px] p-4 border rounded-lg">
                    <div className="space-y-4">
                      {currentSession.messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="text-sm">
                              {formatMessage(message.content)}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 min-h-[80px] resize-none"
                      disabled={isTyping}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim() || isTyping}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={endConversation}
                        variant="outline"
                        size="icon"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice-to-Voice AI Mode */}
        <TabsContent value="voice-to-voice" className="mt-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Voice-to-Voice AI Conversation
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
              <div className="p-6 bg-muted/30 rounded-lg text-center">
                <VoiceInterface 
                  onSpeakingChange={setIsAISpeaking}
                  context={context}
                  conversationType="interview"
                  userId={userId}
                  bookId={bookId}
                  chapterId={chapterId}
                  onConversationUpdate={() => {
                    // Refresh conversation history to show the voice conversation
                    loadConversationHistory();
                    toast({
                      title: "Conversation saved",
                      description: "Your voice conversation has been saved to your history.",
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Conversations */}
      {conversationHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Self Conversations Section */}
              {conversationHistory.filter(session => session.isSelfConversation).length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-muted-foreground">Self Conversations</h4>
                  <div className="space-y-2">
                    {conversationHistory
                      .filter(session => session.isSelfConversation)
                      .slice(0, 3)
                      .map((session) => (
                        <div key={session.sessionId} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Self Entry
                              </Badge>
                              <Badge 
                                variant={session.conversationMedium === 'voice' ? 'default' : 'secondary'}
                                className={session.conversationMedium === 'voice' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {session.conversationMedium === 'voice' ? '🎤 Voice' : '💬 Text'}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {session.messages.length} {session.messages.length === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                          <Button
                            onClick={() => resumeConversation(session)}
                            size="sm"
                            variant="ghost"
                          >
                            View Entry
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* AI Conversations Section */}
              {conversationHistory.filter(session => !session.isSelfConversation).length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-muted-foreground">AI Conversations</h4>
                  <div className="space-y-2">
                    {conversationHistory
                      .filter(session => !session.isSelfConversation)
                      .slice(0, 3)
                      .map((session) => (
                        <div key={session.sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {session.conversationType}
                              </Badge>
                              <Badge 
                                variant={session.conversationMedium === 'voice' ? 'default' : 'secondary'}
                                className={session.conversationMedium === 'voice' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {session.conversationMedium === 'voice' ? '🎤 Voice' : '💬 Text'}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {session.messages.length} messages
                            </span>
                          </div>
                          <Button
                            onClick={() => resumeConversation(session)}
                            size="sm"
                            variant="ghost"
                            disabled={session.conversationMedium === 'voice'}
                          >
                            {session.conversationMedium === 'voice' ? 'View Transcript' : 'Resume'}
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};