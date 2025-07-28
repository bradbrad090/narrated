import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not found');
    socket.close(1011, 'Server configuration error');
    return response;
  }

  console.log('WebSocket connection established, API key found');
  console.log('API key format check:', OPENAI_API_KEY.startsWith('sk-') ? 'Valid format' : 'Invalid format');

  socket.onopen = () => {
    console.log('Client WebSocket opened');
    // Connect to OpenAI Realtime API
    const openAIUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
    
    openAISocket = new WebSocket(openAIUrl, [
      `Bearer.${OPENAI_API_KEY}`,
      'realtime-v1'
    ]);

    openAISocket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
    };

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received from OpenAI:', data.type);
      
      // Log specific message types for debugging
      if (data.type === 'response.audio.delta') {
        console.log('Audio delta received, length:', data.delta?.length || 0);
      } else if (data.type === 'response.audio_transcript.delta') {
        console.log('Audio transcript delta:', data.delta);
      } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
        console.log('User transcript completed:', data.transcript);
      }

      // Handle errors from OpenAI
      if (data.type === 'error') {
        console.error('OpenAI Error:', data);
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: `OpenAI API Error: ${data.error?.message || 'Unknown error'}` 
        }));
        return;
      }

      // Send session update after receiving session.created
      if (data.type === 'session.created') {
        console.log('Session created, sending session update');
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `You are a helpful AI assistant. When the user speaks, respond naturally and ask them questions about their day or interests. Keep responses short and conversational.`,
            voice: "sage",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800
            },
            temperature: 0.8,
            max_response_output_tokens: 500
          }
        };
        
        console.log('Sending session update:', JSON.stringify(sessionUpdate, null, 2));
        openAISocket?.send(JSON.stringify(sessionUpdate));
        
        // Send an initial greeting to test the connection
        setTimeout(() => {
          console.log('Sending initial greeting');
          const greeting = {
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: "Hello! I can hear you now. Please say something and I'll respond."
                }
              ]
            }
          };
          openAISocket?.send(JSON.stringify(greeting));
          openAISocket?.send(JSON.stringify({ type: "response.create" }));
        }, 1000);
      }

      // Handle function calls
      if (data.type === 'response.function_call_arguments.done') {
        console.log('Function call completed:', data);
        const args = JSON.parse(data.arguments);
        
        // Send the function call result back to the client for processing
        socket.send(JSON.stringify({
          type: 'function_call',
          function_name: 'save_chapter_content',
          arguments: args
        }));

        // Send function call result back to OpenAI
        const functionResult = {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: data.call_id,
            output: JSON.stringify({ success: true, message: "Content saved successfully" })
          }
        };
        openAISocket?.send(JSON.stringify(functionResult));
      }

      // Forward all other messages to client
      socket.send(event.data);
    };

    openAISocket.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'Connection to AI failed' }));
    };

    openAISocket.onclose = () => {
      console.log('OpenAI WebSocket closed');
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    console.log('Received from client:', event.data);
    // Forward client messages to OpenAI
    if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
      openAISocket.send(event.data);
    }
  };

  socket.onclose = () => {
    console.log('Client WebSocket closed');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('Client WebSocket error:', error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});