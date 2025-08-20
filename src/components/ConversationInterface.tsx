import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import VoiceInterface from '@/components/VoiceInterface';
import { MessageCircle, Send, Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
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
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [directPrompt, setDirectPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
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
    clearDraft
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
    setIsVoiceMode(false);
  };

  const generateDirectContent = async () => {
    if (!directPrompt.trim() || !userId || !bookId) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-autobiography', {
        body: {
          prompt: `Write autobiography content based on this prompt: ${directPrompt}. Make it personal and engaging.`,
          userId: userId,
          bookId: bookId
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.content && onContentGenerated) {
        onContentGenerated(data.content);
        setDirectPrompt("");
        
        toast({
          title: "Content generated!",
          description: "AI has generated new content for your chapter.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error generating content",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
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

  if (!currentSession) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Direct Content Generation */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Generate Content Directly</h3>
          <Textarea
            placeholder="Example: Write about my childhood growing up in a small town, focusing on summer adventures and family traditions..."
            value={directPrompt}
            onChange={(e) => setDirectPrompt(e.target.value)}
            className="min-h-[100px]"
          />
          <Button 
            onClick={generateDirectContent}
            disabled={!directPrompt.trim() || generating}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate Content"}
          </Button>
        </div>

        <div className="border-t pt-6">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
            <p className="text-muted-foreground mb-6">
              Choose how you'd like to interact with the AI assistant
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Voice Interface Section */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Voice Conversation</h3>
                {isAISpeaking && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    AI Speaking
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Start a real-time voice conversation with the AI assistant
              </p>
              <VoiceInterface 
                onSpeakingChange={setIsAISpeaking}
                context={context}
                conversationType="interview"
                userId={userId}
                bookId={bookId}
                chapterId={chapterId}
                onConversationUpdate={() => {
                  // Refresh conversation history when voice chat ends
                  window.location.reload();
                }}
              />
            </div>

            {/* Text Conversation Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => startConversation('interview')}
                disabled={isLoading}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <MessageCircle className="h-6 w-6" />
                )}
                <div className="text-center">
                  <div className="font-medium">Text Interview</div>
                  <div className="text-sm text-muted-foreground">
                    Structured Q&A about your life
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => startConversation('reflection')}
                disabled={isLoading}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <MessageCircle className="h-6 w-6" />
                )}
                <div className="text-center">
                  <div className="font-medium">Text Reflection</div>
                  <div className="text-sm text-muted-foreground">
                    Deep exploration of meanings
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => startConversation('brainstorming')}
                disabled={isLoading}
                className="h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <MessageCircle className="h-6 w-6" />
                )}
                <div className="text-center">
                  <div className="font-medium">Text Brainstorming</div>
                  <div className="text-sm text-muted-foreground">
                    Generate creative story ideas
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {conversationHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Recent Conversations</h3>
              <div className="space-y-2">
                {conversationHistory.slice(0, 3).map((session) => (
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
      </div>
    );
  }

  return (
    <Card className={`${className} w-full max-w-4xl mx-auto flex flex-col h-[600px]`}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <CardTitle className="text-lg">
              Conversation
            </CardTitle>
            <Badge variant="outline">
              {currentSession.conversationType}
            </Badge>
            {isAISpeaking && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                AI Speaking
              </div>
            )}
          </div>
          <Button
            onClick={endConversation}
            variant="outline"
            size="sm"
          >
            End Session
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {currentSession.messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-4'
                      : 'bg-muted mr-4'
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
                <div className="bg-muted rounded-lg p-3 mr-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t p-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Share your thoughts, ask questions, or tell a story..."
                className="min-h-[80px] resize-none"
                disabled={isTyping}
                aria-label="Message input"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isTyping}
                size="icon"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                variant="outline"
                size="icon"
                aria-label={isVoiceMode ? "Stop voice input" : "Start voice input"}
              >
                {isVoiceMode ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {isVoiceMode && (
            <div className="mt-2">
              <VoiceRecorder
                onTranscription={handleVoiceTranscription}
                disabled={isTyping}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};