import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Square } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onTranscription, 
  disabled = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Please check your microphone permissions",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio }
          });

          if (error) throw error;

          if (data.success && data.text) {
            onTranscription(data.text);
            toast({
              title: "Transcription complete",
              description: "Your speech has been converted to text",
            });
          } else {
            throw new Error(data.error || 'Transcription failed');
          }
        } catch (error: any) {
          toast({
            title: "Transcription failed",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      setIsProcessing(false);
    }
  };

  return (
    <>
      {!isRecording ? (
        <Button
          variant="outline"
          onClick={startRecording}
          disabled={disabled || isProcessing}
          className="w-full h-10"
        >
          <Mic className="h-4 w-4 mr-2" />
          {isProcessing ? "Processing..." : "Voice Input"}
        </Button>
      ) : (
        <Button
          variant="destructive"
          onClick={stopRecording}
          className="w-full h-10 animate-pulse"
        >
          <Square className="h-4 w-4 mr-2" />
          Stop Recording
        </Button>
      )}
    </>
  );
};