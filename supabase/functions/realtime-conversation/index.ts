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

  console.log('WebSocket connection established');

  socket.onopen = () => {
    console.log('Client WebSocket opened');
    // Connect to OpenAI Realtime API
    openAISocket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`,
      [],
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    openAISocket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
    };

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received from OpenAI:', data.type, data);

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
            instructions: `You are an expert autobiography writing assistant. Your role is to help users tell their life story through conversational dialogue. 

When a user shares a story or memory:
1. Listen carefully and acknowledge what they've shared
2. Ask thoughtful follow-up questions to help them elaborate (like "What emotions did you feel?", "Who else was there?", "What did that teach you?", "How did that change you?")
3. Help them uncover rich details, emotions, and meaning in their experiences
4. Guide them to explore the significance of events in their life journey

Keep your questions conversational and empathetic. Help them paint vivid pictures with their words. Focus on drawing out sensory details, emotions, relationships, and personal growth.

Remember: You're helping them craft their autobiography chapter by chapter, so encourage depth and reflection.`,
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
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: "function",
                name: "save_chapter_content",
                description: "Save or update the current chapter content based on the conversation",
                parameters: {
                  type: "object",
                  properties: {
                    content: { 
                      type: "string",
                      description: "The narrative content to add or update in the chapter"
                    },
                    action: {
                      type: "string",
                      enum: ["append", "replace"],
                      description: "Whether to append to existing content or replace it"
                    }
                  },
                  required: ["content", "action"]
                }
              }
            ],
            tool_choice: "auto",
            temperature: 0.8,
            max_response_output_tokens: "inf"
          }
        };
        
        openAISocket?.send(JSON.stringify(sessionUpdate));
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