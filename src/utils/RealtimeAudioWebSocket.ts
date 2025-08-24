// Enhanced realtime audio utilities using WebSocket for OpenAI Realtime API with question tracking

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

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

// Audio queue for sequential playback
class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer.slice(0));
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext(); // Continue with next segment even if current fails
    }
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
  }
}

// Create WAV from PCM data
const createWavFromPCM = (pcmData: Uint8Array): Uint8Array => {
  // Convert bytes to 16-bit samples (little endian)
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }
  
  // WAV header parameters
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = int16Data.byteLength;
  const fileSize = 36 + dataSize;

  // Create WAV header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true); // File size
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Combine header and data
  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  return wavArray;
};

// Singleton audio queue instance
let audioQueueInstance: AudioQueue | null = null;

const getOrCreateAudioQueue = (audioContext: AudioContext): AudioQueue => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue(audioContext);
  }
  return audioQueueInstance;
};

export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array): Promise<void> => {
  const queue = getOrCreateAudioQueue(audioContext);
  await queue.addToQueue(audioData);
};

// Enhanced RealtimeChat class using WebSocket
export class RealtimeVoiceChat {
  private ws: WebSocket | null = null;
  private audioRecorder: AudioRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private sessionId: string | null = null;
  private userId: string;
  private bookId: string;
  private chapterId?: string;
  private conversationType: string;
  private isRecording = false;

  constructor(
    private onMessage: (message: any) => void,
    userId: string,
    bookId: string,
    chapterId?: string
  ) {
    this.userId = userId;
    this.bookId = bookId;
    this.chapterId = chapterId;
    this.conversationType = 'interview';
  }

  async init(context?: any, conversationType?: string): Promise<void> {
    try {
      this.conversationType = conversationType || 'interview';
      
      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      
      // Connect to our Supabase edge function via WebSocket
      const wsUrl = `wss://keadkwromhlyvoyxvcmi.functions.supabase.co/realtime-voice-chat?userId=${this.userId}&bookId=${this.bookId}&conversationType=${this.conversationType}${this.chapterId ? `&chapterId=${this.chapterId}` : ''}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected to voice chat service');
      };

      this.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data.type);
        
        await this.handleWebSocketMessage(data);
        this.onMessage(data);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onMessage({
          type: 'error',
          error: { message: 'WebSocket connection error' }
        });
      };

      // Wait for connection to be ready
      await this.waitForConnection();
      
      // Start audio recording
      await this.startAudioRecording();
      
      console.log('RealtimeVoiceChat initialized successfully');
    } catch (error) {
      console.error('Error initializing RealtimeVoiceChat:', error);
      throw error;
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      const checkConnection = () => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
        } else if (this.ws?.readyState === WebSocket.CLOSED || this.ws?.readyState === WebSocket.CLOSING) {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  private async startAudioRecording(): Promise<void> {
    try {
      this.audioRecorder = new AudioRecorder((audioData: Float32Array) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.isRecording) {
          const encodedAudio = encodeAudioForAPI(audioData);
          
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });

      await this.audioRecorder.start();
      this.isRecording = true;
      console.log('Audio recording started');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  private async handleWebSocketMessage(data: any): Promise<void> {
    try {
      switch (data.type) {
        case 'connection_ready':
          this.sessionId = data.sessionId;
          console.log('Voice chat session ready:', this.sessionId);
          break;

        case 'response.audio.delta':
          if (this.audioContext && data.delta) {
            // Convert base64 to Uint8Array and play
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            await playAudioData(this.audioContext, bytes);
          }
          break;

        case 'response.audio_transcript.delta':
          // Handle transcript updates if needed
          console.log('AI transcript delta:', data.delta);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User speech transcription completed
          console.log('User transcript:', data.transcript);
          break;

        case 'response.audio.done':
          console.log('AI finished speaking');
          break;

        case 'error':
          console.error('Voice chat error:', data.error);
          break;

        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not ready');
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

    this.ws.send(JSON.stringify(event));
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  disconnect(): void {
    console.log('Disconnecting RealtimeVoiceChat');
    
    this.isRecording = false;
    
    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (audioQueueInstance) {
      audioQueueInstance.clear();
      audioQueueInstance = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('RealtimeVoiceChat disconnected');
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}