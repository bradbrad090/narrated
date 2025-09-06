import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { useConversationState } from '@/hooks/useConversationState';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';

interface TextAssistedModeProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  context?: any;
  className?: string;
  onConversationSaved?: () => void;
}

export const TextAssistedMode: React.FC<TextAssistedModeProps> = ({
  userId,
  bookId,
  chapterId,
  context,
  className = "",
  onConversationSaved
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    currentSession,
    ui: { isLoading, isTyping },
    startConversation,
    sendMessage,
    endConversation
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

  // Optimized scroll to bottom with proper cleanup
  useEffect(() => {
    if (currentSession?.messages && currentSession.messages.length > 0) {
      // Use requestAnimationFrame for better performance
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        });
      }, 50); // Reduced timeout for better responsiveness

      return () => clearTimeout(timeoutId);
    }
  }, [currentSession?.messages?.length, isTyping]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !currentSession) return;

    await sendMessage(currentMessage);
    setCurrentMessage('');
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartConversation = () => {
    startConversation('interview');
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <Card className={`w-full ${className}`}>
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
              onClick={handleStartConversation}
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5 mr-2" />
              )}
              {CONVERSATION_CONFIG.BUTTON_TEXT.START_CONVERSATION}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Messages Display */}
            <ScrollArea 
              ref={scrollAreaRef}
              className={`h-[${CONVERSATION_CONFIG.CONVERSATION_SCROLL_HEIGHT}] p-4 border rounded-lg`}
            >
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
                className={`flex-1 min-h-[${CONVERSATION_CONFIG.MESSAGE_INPUT_MIN_HEIGHT}] resize-none`}
                disabled={isTyping}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isTyping}
                  size="icon"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    endConversation();
                    onConversationSaved?.();
                  }}
                  variant="outline"
                  size="icon"
                  title="Submit conversation"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};