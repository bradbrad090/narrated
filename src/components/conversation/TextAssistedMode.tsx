import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Loader2, CheckCircle, Sparkles, Lightbulb, RotateCcw } from 'lucide-react';
import { useConversationState } from '@/hooks/useConversationState';
import { CONVERSATION_CONFIG } from '@/config/conversationConfig';
import { smartSuggestionService, SmartSuggestion } from '@/services/SmartSuggestionService';

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
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    currentSession,
    ui: { isLoading, isTyping },
    startConversation,
    sendMessage,
    endConversation,
    resumeConversation,
    conversationInsights,
    continuationSuggestions,
    isHealthyConversation
  } = useConversationState({
    userId,
    bookId,
    chapterId
  });

  // Generate smart suggestions based on conversation
  const smartSuggestions = useMemo(() => {
    if (!currentSession?.messages || currentSession.messages.length < 2) {
      return [];
    }
    return smartSuggestionService.generateSuggestions(currentSession.messages);
  }, [currentSession?.messages]);

  // Get optimal conversation style
  const optimalStyle = useMemo(() => {
    if (!currentSession?.messages) return 'CONVERSATIONAL';
    return smartSuggestionService.getOptimalStyle(currentSession.messages);
  }, [currentSession?.messages]);

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

  const handleUseSuggestion = (suggestion: SmartSuggestion) => {
    setCurrentMessage(suggestion.text);
    textareaRef.current?.focus();
    setShowSuggestions(false);
  };

  const handleResumeOptimized = () => {
    // Smart continuation: if we have a recent session, resume it
    if (currentSession) {
      resumeConversation(currentSession);
    }
  };

  const formatMessage = (content: string | undefined | null) => {
    // Handle undefined, null, or empty content
    if (!content || typeof content !== 'string') {
      return <span className="text-muted-foreground italic">No content</span>;
    }
    
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <Card className={`w-full min-h-[320px] ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Text-Assisted Conversation
          </div>
          {currentSession && conversationInsights && (
            <div className="flex items-center gap-2">
              {isHealthyConversation ? (
                <Badge variant="secondary" className="text-xs">
                  Engaged
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-orange-600">
                  Needs encouragement
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {conversationInsights.conversationHealth}/5 ⭐
              </Badge>
            </div>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Have a text conversation with AI to develop your story
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentSession ? (
          <div className="text-center py-8">
            <div className="space-y-4">
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
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resume Indicator */}
            {currentSession.messages.length > 1 && (
              <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                <div className="flex items-center gap-2 text-sm">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <span>Continuing conversation with {currentSession.messages.length} messages</span>
                </div>
              </div>
            )}
            
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

            {/* Smart Suggestions */}
            {showSuggestions && smartSuggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Smart suggestions</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuggestions(false)}
                    className="h-6 text-xs"
                  >
                    Hide
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {smartSuggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleUseSuggestion(suggestion)}
                    >
                      {suggestion.text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Continuation Suggestions (from smart flow) */}
            {continuationSuggestions && continuationSuggestions.length > 0 && (
              <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI Insights</span>
                </div>
                <div className="space-y-2">
                  {continuationSuggestions.map((suggestion: any, index: number) => (
                    <div key={index} className="text-xs">
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={() => setCurrentMessage(suggestion.text)}
                      >
                        {suggestion.text}
                      </Badge>
                      <span className="ml-2 text-muted-foreground">
                        • {suggestion.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                {!showSuggestions && smartSuggestions.length > 0 && (
                  <Button
                    onClick={() => setShowSuggestions(true)}
                    variant="outline"
                    size="icon"
                    title="Show suggestions"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                )}
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