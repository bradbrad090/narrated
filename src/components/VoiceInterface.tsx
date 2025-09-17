import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { VoiceEvent, VoiceInterfaceProps } from '@/types/voice';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onSpeakingChange, 
  context, 
  conversationType = 'interview',
  userId,
  bookId,
  chapterId,
  isDisabled = false,
  onConversationUpdate
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const chatRef = useRef<RealtimeChat | null>(null);
  const mountedRef = useRef(true);

  const handleMessage = (event: VoiceEvent) => {
    if (!mountedRef.current) return;
    
    // Handle different event types
    if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
      onSpeakingChange(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
      onSpeakingChange(false);
    } else if (event.type === 'session.created') {
      setConnectionError(null);
      toast({
        title: "Voice Chat Connected",
        description: "You can now speak with the AI assistant",
      });
    } else if (event.type === 'error') {
      const errorMessage = event.error?.message || "An error occurred during voice chat";
      setConnectionError(errorMessage);
      setIsConnected(false);
      setIsSpeaking(false);
      onSpeakingChange(false);
      
      toast({
        title: "Voice Chat Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const startConversation = async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Check microphone permissions first
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permissions.state === 'denied') {
        throw new Error('Microphone access is required for voice chat. Please enable microphone permissions in your browser settings.');
      }
      
      // Test microphone access
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStream.getTracks().forEach(track => track.stop()); // Clean up test stream
      
      if (!mountedRef.current) return;
      
      chatRef.current = new RealtimeChat(handleMessage, userId, bookId, chapterId);
      await chatRef.current.init(context);
      
      if (mountedRef.current) {
        setIsConnected(true);
      }
      
    } catch (error) {
      if (!mountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice conversation';
      setConnectionError(errorMessage);
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        setIsConnecting(false);
      }
    }
  };

  const endConversation = () => {
    if (!isConnected) return;
    
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    setConnectionError(null);
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
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="w-full">
      {!isConnected ? (
        <div className="text-center py-8 space-y-4">
          <Button 
            onClick={startConversation}
            disabled={isConnecting || isDisabled}
            size="lg"
            className={`min-w-[200px] ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <Phone className="h-5 w-5 mr-2" />
                {isDisabled ? "Chapter Submitted" : "Start Voice Chat"}
              </>
            )}
          </Button>
          
          {connectionError && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md max-w-md mx-auto">
              {connectionError}
            </div>
          )}
          
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click to start a voice conversation. Make sure your microphone is enabled.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {isSpeaking ? (
              <>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
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