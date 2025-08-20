import { supabase } from '@/integrations/supabase/client';

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;
  private sessionId: string | null = null;
  private userId: string;
  private bookId: string;
  private chapterId?: string;
  private conversationType: string;
  private messages: Array<{role: string, content: string, timestamp: string}> = [];
  private currentTranscript = '';

  constructor(
    private onMessage: (message: any) => void, 
    userId: string, 
    bookId: string, 
    chapterId?: string
  ) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.userId = userId;
    this.bookId = bookId;
    this.chapterId = chapterId;
    this.conversationType = 'interview';
  }

  async init(context?: any, conversationType?: string) {
    try {
      this.conversationType = conversationType || 'interview';
      
      // Generate session ID for voice conversation
      this.sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build instructions based on context
      const instructions = this.buildInstructions(context, conversationType);

      // Get ephemeral token from our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("realtime-token", {
        body: { 
          instructions,
          voice: "alloy"
        }
      });
      
      if (error || !data.client_secret?.value) {
        throw new Error("Failed to get ephemeral token: " + (error?.message || "No token received"));
      }

      const EPHEMERAL_KEY = data.client_secret.value;

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio
      this.pc.ontrack = e => {
        console.log("Received remote audio track");
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("Received event:", event);
        this.handleRealtimeEvent(event);
        this.onMessage(event);
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`SDP exchange failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established");

      // Wait for data channel to be ready
      await new Promise((resolve) => {
        if (this.dc?.readyState === 'open') {
          resolve(void 0);
        } else {
          this.dc?.addEventListener('open', () => resolve(void 0), { once: true });
        }
      });

      // Create initial chat history entry for voice conversation
      await this.createChatHistoryEntry();

      console.log("Voice chat ready!");

    } catch (error) {
      console.error("Error initializing chat:", error);
      throw error;
    }
  }

  private handleRealtimeEvent(event: any) {
    switch (event.type) {
      case 'response.audio_transcript.delta':
        // Accumulate AI speech transcript
        this.currentTranscript += event.delta;
        break;
      
      case 'response.audio_transcript.done':
        // AI finished speaking, save the complete transcript
        if (this.currentTranscript.trim()) {
          this.messages.push({
            role: 'assistant',
            content: this.currentTranscript.trim(),
            timestamp: new Date().toISOString()
          });
          this.updateChatHistory();
          this.currentTranscript = '';
        }
        break;
      
      case 'conversation.item.input_audio_transcription.completed':
        // User finished speaking, save their transcript
        if (event.transcript?.trim()) {
          this.messages.push({
            role: 'user',
            content: event.transcript.trim(),
            timestamp: new Date().toISOString()
          });
          this.updateChatHistory();
        }
        break;
    }
  }

  private async createChatHistoryEntry() {
    if (!this.sessionId) return;

    try {
      const { error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: this.userId,
          chapter_id: this.chapterId,
          session_id: this.sessionId,
          conversation_type: this.conversationType,
          conversation_medium: 'voice',
          messages: [],
          context_snapshot: {},
          conversation_goals: this.generateConversationGoals()
        });

      if (error) {
        console.error('Error creating chat history:', error);
      } else {
        console.log('Voice chat history entry created successfully');
      }
    } catch (error) {
      console.error('Error creating chat history:', error);
    }
  }

  private async updateChatHistory() {
    if (!this.sessionId) return;

    try {
      console.log('Updating chat history with', this.messages.length, 'messages');
      const { error } = await supabase
        .from('chat_histories')
        .update({
          messages: this.messages
        })
        .eq('session_id', this.sessionId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Error updating chat history:', error);
      } else {
        console.log('Voice chat history updated successfully');
      }
    } catch (error) {
      console.error('Error updating chat history:', error);
    }
  }

  private generateConversationGoals(): string[] {
    switch (this.conversationType) {
      case 'interview':
        return [
          'Gather specific life stories and experiences',
          'Explore key relationships and influences',
          'Document important life events chronologically',
          'Capture personal growth and learning moments'
        ];
      case 'reflection':
        return [
          'Explore deeper meanings and life lessons',
          'Understand personal values and beliefs',
          'Reflect on life changes and transformations',
          'Connect past experiences to current wisdom'
        ];
      case 'brainstorming':
        return [
          'Generate creative story ideas and themes',
          'Identify unique personal experiences',
          'Explore different narrative perspectives',
          'Develop compelling chapter concepts'
        ];
      default:
        return ['Engage in meaningful conversation about life experiences'];
    }
  }

  private buildInstructions(context: any, conversationType: string): string {
    let baseInstructions = `You are a compassionate life coach and autobiography assistant helping someone document their life story. Your role is to engage in thoughtful conversation that draws out meaningful stories and experiences.

Be warm, empathetic, and genuinely interested. Ask open-ended questions that encourage storytelling and help the person explore emotions and meanings behind events. Keep responses conversational and personal.`;

    if (context) {
      baseInstructions += `\n\nContext about the person:\n${JSON.stringify(context, null, 2)}`;
    }

    if (conversationType) {
      baseInstructions += `\n\nConversation Type: ${conversationType}`;
      
      switch (conversationType) {
        case 'interview':
          baseInstructions += `\nFocus on gathering specific life stories and experiences. Explore key relationships and influences. Document important life events chronologically.`;
          break;
        case 'reflection':
          baseInstructions += `\nExplore deeper meanings and life lessons. Help understand personal values and beliefs. Reflect on life changes and transformations.`;
          break;
        case 'brainstorming':
          baseInstructions += `\nGenerate creative story ideas and themes. Help identify unique personal experiences. Explore different narrative perspectives.`;
          break;
      }
    }

    return baseInstructions;
  }

  async sendMessage(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({type: 'response.create'}));
  }

  disconnect() {
    // Save final state before disconnecting
    if (this.messages.length > 0) {
      this.updateChatHistory();
    }
    
    this.dc?.close();
    this.pc?.close();
    this.audioEl.srcObject = null;
  }
}