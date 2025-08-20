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

  constructor(private onMessage: (message: any) => void) {
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async init(context?: any, conversationType?: string) {
    try {
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

      console.log("Voice chat ready!");

    } catch (error) {
      console.error("Error initializing chat:", error);
      throw error;
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
    this.dc?.close();
    this.pc?.close();
    this.audioEl.srcObject = null;
  }
}