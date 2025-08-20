import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface VoiceInterfaceProps {
  onSpeakingChange: (speaking: boolean) => void;
  context?: any;
  conversationType?: string;
  userId: string;
  bookId: string;
  chapterId?: string;
  onConversationUpdate?: () => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ 
  onSpeakingChange, 
  context, 
  conversationType = 'interview',
  userId,
  bookId,
  chapterId,
  onConversationUpdate
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    console.log('Received message:', event);
    
    // Handle different event types
    if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
      onSpeakingChange(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
      onSpeakingChange(false);
    } else if (event.type === 'session.created') {
      console.log('Session created successfully');
    } else if (event.type === 'error') {
      console.error('Voice chat error:', event);
      toast({
        title: "Voice Chat Error",
        description: event.error?.message || "An error occurred during voice chat",
        variant: "destructive",
      });
    }
  };

  const startConversation = async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      chatRef.current = new RealtimeChat(handleMessage, userId, bookId, chapterId);
      await chatRef.current.init(context, conversationType);
      setIsConnected(true);
      
      toast({
        title: "Voice Chat Connected",
        description: "You can now speak with the AI assistant",
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : 'Failed to start voice conversation',
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    onSpeakingChange(false);
    
    // Notify parent component that conversation might have been updated
    if (onConversationUpdate) {
      onConversationUpdate();
    }
    
    toast({
      title: "Voice Chat Ended",
      description: "Voice conversation has been saved to your chat history",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isConnected ? (
        <Button 
          onClick={startConversation}
          disabled={isConnecting}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Connecting...
            </>
          ) : (
            <>
              <Phone className="h-4 w-4 mr-2" />
              Start Voice Chat
            </>
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            {isSpeaking ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                AI Speaking
              </>
            ) : (
              <>
                <Mic className="h-3 w-3" />
                Listening
              </>
            )}
          </div>
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="sm"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            End Call
          </Button>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;