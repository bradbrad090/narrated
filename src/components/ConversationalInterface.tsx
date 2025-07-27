import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ConversationalChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff, MessageCircle, Volume2 } from 'lucide-react';

interface ConversationalInterfaceProps {
  onContentUpdate: (content: string, action: 'append' | 'replace') => void;
  disabled?: boolean;
}

interface Message {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const ConversationalInterface: React.FC<ConversationalInterfaceProps> = ({
  onContentUpdate,
  disabled = false
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAiMessage, setCurrentAiMessage] = useState('');
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const chatRef = useRef<ConversationalChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAiMessage, currentUserMessage]);

  const handleMessage = (message: any) => {
    console.log('Handling message:', message.type);
    
    switch (message.type) {
      case 'connected':
        setIsConnected(true);
        setIsConnecting(false);
        toast({
          title: "Connected!",
          description: "You can now start talking about your story.",
        });
        break;
        
      case 'disconnected':
        setIsConnected(false);
        setIsConnecting(false);
        setIsSpeaking(false);
        break;
        
      case 'error':
        setIsConnecting(false);
        toast({
          title: "Connection Error",
          description: message.message || "Failed to connect to AI",
          variant: "destructive",
        });
        break;
        
      case 'user_transcript':
        // Accumulate user speech
        setCurrentUserMessage(prev => prev + message.content);
        break;
        
      case 'ai_transcript':
        // Accumulate AI speech
        setCurrentAiMessage(prev => prev + message.content);
        setIsSpeaking(true);
        break;
        
      case 'response.audio.done':
        // AI finished speaking
        if (currentAiMessage.trim()) {
          setMessages(prev => [...prev, {
            type: 'ai',
            content: currentAiMessage.trim(),
            timestamp: new Date()
          }]);
          setCurrentAiMessage('');
        }
        setIsSpeaking(false);
        break;
        
      case 'input_audio_buffer.speech_stopped':
        // User finished speaking
        if (currentUserMessage.trim()) {
          setMessages(prev => [...prev, {
            type: 'user',
            content: currentUserMessage.trim(),
            timestamp: new Date()
          }]);
          setCurrentUserMessage('');
        }
        break;
    }
  };

  const handleFunctionCall = (functionName: string, args: any) => {
    console.log('Function call:', functionName, args);
    
    if (functionName === 'save_chapter_content') {
      onContentUpdate(args.content, args.action);
      toast({
        title: "Content Updated",
        description: `Chapter content has been ${args.action === 'append' ? 'added to' : 'updated'}`,
      });
    }
  };

  const startConversation = async () => {
    if (disabled) return;
    
    setIsConnecting(true);
    try {
      chatRef.current = new ConversationalChat(handleMessage, handleFunctionCall);
      await chatRef.current.init();
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsConnecting(false);
      toast({
        title: "Failed to Start",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    setCurrentAiMessage('');
    setCurrentUserMessage('');
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <span>Conversational AI Assistant</span>
        </CardTitle>
        <CardDescription>
          Have a natural conversation about your story. The AI will ask follow-up questions to help you elaborate and will automatically update your chapter.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Connection Controls */}
        <div className="flex justify-center">
          {!isConnected ? (
            <Button 
              onClick={startConversation}
              disabled={isConnecting || disabled}
              className="flex items-center space-x-2"
              variant="hero"
            >
              <Mic className="h-4 w-4" />
              <span>{isConnecting ? "Connecting..." : "Start Conversation"}</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button 
                onClick={endConversation}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <MicOff className="h-4 w-4" />
                <span>End Conversation</span>
              </Button>
              
              {isSpeaking && (
                <div className="flex items-center space-x-2 text-primary">
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">AI is speaking...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation Display */}
        {isConnected && (
          <div className="flex-1 bg-muted/30 rounded-lg p-4 overflow-y-auto max-h-96">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Current messages being typed */}
              {currentUserMessage && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-3 rounded-lg bg-primary/70 text-primary-foreground">
                    <p className="text-sm">{currentUserMessage}</p>
                    <p className="text-xs opacity-70 mt-1">Speaking...</p>
                  </div>
                </div>
              )}
              
              {currentAiMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-background border">
                    <p className="text-sm">{currentAiMessage}</p>
                    <p className="text-xs opacity-70 mt-1">AI is speaking...</p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Instructions */}
        {isConnected && (
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <p>🎤 Just start talking about your story</p>
            <p>The AI will ask follow-up questions and automatically update your chapter</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationalInterface;