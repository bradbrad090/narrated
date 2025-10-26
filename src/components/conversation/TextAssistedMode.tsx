import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2, CheckCircle, RotateCcw } from 'lucide-react';
import { useConversationState } from '@/hooks/useConversationState';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';

interface TextAssistedModeProps {
  userId: string;
  bookId: string;
  chapterId?: string;
  context?: any;
  isChapterComplete?: boolean;
  className?: string;
  onConversationSaved?: () => void;
  // Conversation state from parent
  currentSession?: any;
  isLoading?: boolean;
  isTyping?: boolean;
  isSubmitting?: boolean;
  onStartConversation?: (type: any) => Promise<any>;
  onSendMessage?: (message: string) => Promise<any>;
}

export const TextAssistedMode: React.FC<TextAssistedModeProps> = ({
  userId,
  bookId,
  chapterId,
  context,
  isChapterComplete = false,
  className = "",
  onConversationSaved,
  // Conversation state from parent
  currentSession,
  isLoading = false,
  isTyping = false,
  isSubmitting = false,
  onStartConversation,
  onSendMessage
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!onSendMessage || !currentMessage.trim() || isLoading || isTyping) return;
    
    const message = currentMessage.trim();
    setCurrentMessage('');
    setShowSuggestions(false);
    
    const updatedSession = await onSendMessage(message);
    if (updatedSession && onConversationSaved) {
      onConversationSaved();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartConversation = async () => {
    if (!onStartConversation || isStarting) return;
    
    setIsStarting(true);
    setShowSuggestions(false);
    try {
      const session = await onStartConversation('interview');
      if (session && onConversationSaved) {
        onConversationSaved();
      }
    } finally {
      setIsStarting(false);
    }
  };

  // Resume functionality removed - users can only view and delete conversations

  const formatMessage = (content: string | undefined | null) => {
    // Handle undefined, null, or empty content
    if (!content || typeof content !== 'string') {
      return <span className="text-muted-foreground italic">No content</span>;
    }
    
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <Card className={`w-full min-h-[320px] ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Have a Text Conversation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Have a text conversation to build your story. If you feel like you would like to change topics, simply ask for a different question or topic!
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentSession || (currentSession && currentSession.messages.length === 0) ? (
          <div className="text-center py-8">
            <div className="space-y-4">
              <Button
                onClick={handleStartConversation}
                disabled={isLoading || isStarting || isChapterComplete}
                size="lg"
                className={isChapterComplete ? "opacity-50 cursor-not-allowed" : ""}
              >
                {isLoading || isStarting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5 mr-2" />
                )}
                {isChapterComplete ? "Chapter Submitted" : CONVERSATION_CONFIG.BUTTON_TEXT.START_CONVERSATION}
              </Button>
              
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Click to start a text conversation. Answer interview questions, or type your thoughts and memories to develop your story.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Messages Display */}
            <ScrollArea 
              ref={scrollAreaRef}
              className="h-[200px] p-4 border rounded-lg"
            >
              <div className="space-y-4">
                {currentSession.messages?.map((message, index) => {
                  // Safety check for message structure
                  if (!message || typeof message !== 'object') {
                    console.warn('Invalid message structure at index', index, message);
                    return null;
                  }
                  
                  return (
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
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'No timestamp'}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                disabled={isTyping || isSubmitting}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isTyping || isSubmitting}
                  size="icon"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    console.log('Submit conversation button clicked', { 
                      currentSession: currentSession?.sessionId, 
                      messageCount: currentSession?.messages?.length 
                    });
                    
                    // Prevent multiple clicks while processing
                    if (isLoading || isTyping || isSubmitting) {
                      console.log('Blocking submit - operation in progress');
                      return;
                    }
                    
                    // Validate session exists with messages
                    if (!currentSession || !currentSession.messages || currentSession.messages.length === 0) {
                      console.error('No active conversation session to submit', { currentSession });
                      return;
                    }
                    
                    // Dispatch event to parent to handle save and summary generation
                    const event = new CustomEvent('saveAndEndConversation');
                    const container = document.querySelector('[data-conversation-interface]');
                    console.log('Dispatching saveAndEndConversation event', { container, sessionId: currentSession.sessionId });
                    container?.dispatchEvent(event);
                  }}
                  variant="outline"
                  size="icon"
                  title={
                    isSubmitting
                      ? "Submitting conversation..."
                      : !currentSession?.messages?.length 
                        ? "No conversation to submit" 
                        : isChapterComplete 
                          ? "Chapter already submitted" 
                          : "Submit conversation"
                  }
                  disabled={isLoading || isTyping || isSubmitting || isChapterComplete || !currentSession?.messages?.length}
                  className={!currentSession?.messages?.length ? "cursor-not-allowed opacity-50" : ""}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};