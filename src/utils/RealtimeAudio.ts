import { supabase } from '@/integrations/supabase/client';

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    if (this.isRecording) {
      throw new Error('AudioRecorder is already recording');
    }

    try {
      // Request microphone with optimized settings for voice
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Create AudioContext with proper sample rate
      this.audioContext = new AudioContext({
        sampleRate: 24000,
        latencyHint: 'interactive'
      });
      
      // Resume AudioContext if suspended (iOS Safari requirement)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Use smaller buffer size for lower latency
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy data to prevent issues with buffer reuse
        const audioData = new Float32Array(inputData.length);
        audioData.set(inputData);
        this.onAudioData(audioData);
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isRecording = true;
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start audio recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  stop() {
    this.isRecording = false;
    this.cleanup();
  }

  private cleanup() {
    try {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
        });
        this.stream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
    } catch (error) {
      // Silent cleanup - don't throw during cleanup
    }
  }

  get recording() {
    return this.isRecording;
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
  // conversationType is hardcoded to 'interview' since we only support one type
  private messages: Array<{role: string, content: string, timestamp: string}> = [];
  private currentTranscript = '';
  private isConnected = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(
    private onMessage: (message: any) => void, 
    userId: string, 
    bookId: string, 
    chapterId?: string
  ) {
    // Create audio element with better configuration
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.audioEl.preload = 'auto';
    
    // Optimize audio element for voice
    try {
      this.audioEl.setAttribute('playsinline', 'true');
      this.audioEl.setAttribute('webkit-playsinline', 'true');
    } catch (error) {
      // Ignore if not supported
    }
    
    this.userId = userId;
    this.bookId = bookId;
    this.chapterId = chapterId;
    // Using 'interview' type for all conversations
    
    // Bind cleanup methods for proper memory management
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleBeforeUnload = () => {
    this.disconnect();
  };

  async init(context?: any) {
    if (this.isConnected) {
      throw new Error('Chat session is already connected');
    }

    this.retryCount = 0;
    return this.initWithRetry(context);
  }

  private async initWithRetry(context?: any): Promise<void> {
    try {
      // All conversations use 'interview' type
      
      // Generate session ID for voice conversation
      this.sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        throw new Error('Connection timeout - please try again');
      }, 30000);

      // Build instructions based on context
      const instructions = await this.buildInstructions(context);

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

      // Create peer connection with optimized configuration
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      // Set up connection state monitoring
      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === 'connected') {
          this.isConnected = true;
          this.clearConnectionTimeout();
        } else if (this.pc?.connectionState === 'failed') {
          this.handleConnectionFailure();
        }
      };

      // Set up remote audio with error handling
      this.pc.ontrack = (e) => {
        try {
          this.audioEl.srcObject = e.streams[0];
          
          // Handle audio element errors
          this.audioEl.onerror = (error) => {
            this.onMessage({ type: 'error', error: { message: 'Audio playback error' } });
          };
        } catch (error) {
          this.onMessage({ type: 'error', error: { message: 'Failed to set up audio stream' } });
        }
      };

      // Get microphone with improved error handling
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const audioTrack = ms.getTracks()[0];
      this.pc.addTrack(audioTrack);

      // Set up data channel with improved error handling
      this.dc = this.pc.createDataChannel("oai-events", {
        ordered: true
      });
      
      this.dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data);
          this.handleRealtimeEvent(event);
          this.onMessage(event);
        } catch (error) {
          this.onMessage({ 
            type: 'error', 
            error: { message: 'Failed to parse message from server' } 
          });
        }
      });

      this.dc.addEventListener("error", (error) => {
        this.onMessage({ 
          type: 'error', 
          error: { message: 'Data channel error' } 
        });
      });

      // Create and set local description
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API with retry logic
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
        signal: AbortSignal.timeout(20000) // 20 second timeout
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

      // Wait for data channel to be ready with timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          if (this.dc?.readyState === 'open') {
            resolve();
          } else {
            this.dc?.addEventListener('open', () => resolve(), { once: true });
          }
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Data channel timeout')), 15000);
        })
      ]);

      // Create initial chat history entry for voice conversation
      await this.createChatHistoryEntry();
      
      this.clearConnectionTimeout();

    } catch (error) {
      this.clearConnectionTimeout();
      
      if (this.retryCount < this.maxRetries && error instanceof Error && 
          (error.message.includes('timeout') || error.message.includes('network'))) {
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        return this.initWithRetry(context);
      }
      
      throw error;
    }
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private handleConnectionFailure() {
    this.onMessage({ 
      type: 'error', 
      error: { message: 'Connection failed - please try reconnecting' } 
    });
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
          conversation_type: 'interview',
          conversation_medium: 'voice',
          messages: [],
          context_snapshot: {}
        });

      if (error) {
        console.error('Error creating chat history:', error);
      }
    } catch (error) {
      console.error('Error creating chat history:', error);
    }
  }

  private async updateChatHistory() {
    if (!this.sessionId) return;

    try {
      const { error } = await supabase
        .from('chat_histories')
        .update({
          messages: this.messages
        })
        .eq('session_id', this.sessionId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Error updating chat history:', error);
      }
    } catch (error) {
      console.error('Error updating chat history:', error);
    }
  }


  private async buildInstructions(context: any): Promise<string> {
    let baseInstructions = `You are a compassionate life coach and autobiography assistant helping someone document their life story. Your role is to engage in thoughtful conversation that draws out meaningful stories and experiences.

Be warm, empathetic, and genuinely interested. Ask open-ended questions that encourage storytelling and help the person explore emotions and meanings behind events. Keep responses conversational and personal.`;

    if (context) {
      baseInstructions += `\n\nContext about the person:\n${JSON.stringify(context, null, 2)}`;
    }

    baseInstructions += `\n\nFocus on gathering specific life stories and experiences. Explore key relationships and influences. Document important life events chronologically.`;

    // Get past opening questions to avoid duplicates
    try {
      const { data: pastSessions } = await supabase
        .from('chat_histories')
        .select('messages')
        .eq('user_id', this.userId)
        .eq('conversation_type', 'interview')
        .eq('conversation_medium', 'voice')
        .neq('messages', '[]')
        .order('created_at', { ascending: false })
        .limit(8);

      if (pastSessions && pastSessions.length > 0) {
        const pastOpenings = pastSessions
          .map(session => {
            const messages = Array.isArray(session.messages) ? session.messages as any[] : [];
            return messages.find((msg: any) => msg.role === 'assistant')?.content;
          })
          .filter(Boolean) as string[];

        if (pastOpenings.length > 0) {
          baseInstructions += `\n\nBegin with a fresh, open-ended question about a different aspect of their life. Do not repeat or closely paraphrase any of these past openings: ${pastOpenings.map((q: string) => `"${q}"`).join(', ')}.`;
        }
      }
    } catch (error) {
      // Silent fail for non-critical duplication check
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
    this.isConnected = false;
    this.clearConnectionTimeout();
    
    // Save final state before disconnecting
    if (this.messages.length > 0) {
      this.updateChatHistory().catch(() => {
        // Silent fail for final save
      });
    }
    
    // Clean up audio recording
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    
    // Properly clean up all WebRTC resources
    try {
      if (this.dc) {
        this.dc.close();
        this.dc = null;
      }
      
      if (this.pc) {
        this.pc.close();
        this.pc = null;
      }
      
      // Clean up audio element
      if (this.audioEl.srcObject) {
        const stream = this.audioEl.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        this.audioEl.srcObject = null;
      }
      
      // Remove all event listeners
      this.audioEl.onerror = null;
      
    } catch (error) {
      // Silent cleanup failure
    }
    
    // Remove event listeners to prevent memory leaks
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    // Clean up references
    this.sessionId = null;
    this.retryCount = 0;
  }

  get connected() {
    return this.isConnected && this.dc?.readyState === 'open';
  }
}