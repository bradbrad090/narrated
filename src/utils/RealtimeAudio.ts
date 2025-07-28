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

// Simple audio player using HTML audio element for more reliable playback
export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  try {
    console.log('Playing audio data, size:', audioData.length);
    
    // Create a simple WAV file with proper headers
    const wavData = createWavFromPCM(audioData);
    
    // Create blob and URL for audio element
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(blob);
    
    // Create and play audio element
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;
    
    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };
      
      audio.oncanplaythrough = () => {
        console.log('Audio can play through, starting playback');
      };
      
      audio.play().catch(error => {
        console.error('Play failed:', error);
        URL.revokeObjectURL(audioUrl);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error playing audio data:', error);
    throw error;
  }
};

const createWavFromPCM = (pcmData: Uint8Array): Uint8Array => {
  // Convert bytes to 16-bit samples (little endian)
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }
  
  // Create WAV header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // WAV header parameters
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, int16Data.byteLength, true);

  // Combine header and data
  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  return wavArray;
};

export class ConversationalChat {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private recorder: AudioRecorder | null = null;
  private onMessageCallback: (message: any) => void;
  private onFunctionCallCallback: (functionName: string, args: any) => void;

  constructor(
    onMessage: (message: any) => void,
    onFunctionCall: (functionName: string, args: any) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onFunctionCallCallback = onFunctionCall;
  }

  async init() {
    try {
      // Initialize audio context
      this.audioContext = new AudioContext();
      
      // Connect to WebSocket
      const wsUrl = `wss://keadkwromhlyvoyxvcmi.supabase.co/functions/v1/realtime-conversation`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('Connected to conversational AI');
        
        // Start recording
        this.recorder = new AudioRecorder((audioData) => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encodeAudioForAPI(audioData)
            }));
          }
        });
        
        await this.recorder.start();
        this.onMessageCallback({ type: 'connected' });
      };

      this.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data.type, data);
        
        // Add specific logging for audio and transcript messages
        if (data.type === 'response.audio.delta') {
          console.log('Processing audio delta, size:', data.delta?.length);
        } else if (data.type?.includes('transcript')) {
          console.log('Transcript message:', data);
        }

        if (data.type === 'response.audio.delta') {
          // Convert base64 to Uint8Array and play
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          if (this.audioContext) {
            await playAudioData(this.audioContext, bytes);
          }
        } else if (data.type === 'response.audio_transcript.delta') {
          // Handle AI speech transcription
          this.onMessageCallback({
            type: 'ai_transcript',
            content: data.delta
          });
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          // Handle user speech transcription
          this.onMessageCallback({
            type: 'user_transcript',
            content: data.transcript
          });
        } else if (data.type === 'function_call') {
          // Handle function calls from the AI
          this.onFunctionCallCallback(data.function_name, data.arguments);
        } else {
          this.onMessageCallback(data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onMessageCallback({ type: 'error', message: 'Connection failed' });
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.onMessageCallback({ type: 'disconnected' });
      };

    } catch (error) {
      console.error('Error initializing conversational chat:', error);
      throw error;
    }
  }

  sendMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
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

  disconnect() {
    this.recorder?.stop();
    this.ws?.close();
    this.audioContext?.close();
  }
}