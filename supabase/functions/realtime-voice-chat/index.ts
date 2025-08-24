import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Get environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase environment variables are required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Store WebSocket connections
const connections = new Map<string, {
  socket: WebSocket;
  openaiSocket: WebSocket | null;
  userId: string;
  bookId: string;
  sessionId: string;
  conversationType: string;
  chapterId?: string;
  messages: Array<{role: string, content: string, timestamp: string}>;
  pendingQuestions: string[];
}>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle WebSocket upgrade
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const bookId = url.searchParams.get('bookId');
  const chapterId = url.searchParams.get('chapterId');
  const conversationType = url.searchParams.get('conversationType') || 'interview';

  if (!userId || !bookId) {
    return new Response("Missing required parameters", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`WebSocket connection established for user ${userId}, session ${sessionId}`);

  socket.onopen = async () => {
    console.log(`Client connected: ${sessionId}`);
    
    // Initialize connection data
    connections.set(sessionId, {
      socket,
      openaiSocket: null,
      userId,
      bookId,
      sessionId,
      conversationType,
      chapterId,
      messages: [],
      pendingQuestions: []
    });

    try {
      // Create chat history entry
      await createChatHistoryEntry(userId, bookId, chapterId, sessionId, conversationType);
      
      // Connect to OpenAI Realtime API
      await connectToOpenAI(sessionId);
      
      socket.send(JSON.stringify({
        type: 'connection_ready',
        sessionId
      }));
    } catch (error) {
      console.error('Error initializing connection:', error);
      socket.send(JSON.stringify({
        type: 'error',
        error: { message: 'Failed to initialize voice chat' }
      }));
    }
  };

  socket.onmessage = (event) => {
    handleClientMessage(sessionId, event.data);
  };

  socket.onclose = () => {
    console.log(`Client disconnected: ${sessionId}`);
    cleanup(sessionId);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for ${sessionId}:`, error);
    cleanup(sessionId);
  };

  return response;
});

async function connectToOpenAI(sessionId: string) {
  const connection = connections.get(sessionId);
  if (!connection) return;

  try {
    // Connect to OpenAI Realtime API
    const openaiSocket = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    openaiSocket.onopen = () => {
      console.log(`Connected to OpenAI for session ${sessionId}`);
      connection.openaiSocket = openaiSocket;
      
      // Send session configuration
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: buildInstructions(connection.conversationType),
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          temperature: 0.8,
          max_response_output_tokens: 'inf'
        }
      };
      
      openaiSocket.send(JSON.stringify(sessionConfig));
    };

    openaiSocket.onmessage = async (event) => {
      await handleOpenAIMessage(sessionId, event.data);
    };

    openaiSocket.onclose = () => {
      console.log(`OpenAI connection closed for session ${sessionId}`);
      connection.openaiSocket = null;
    };

    openaiSocket.onerror = (error) => {
      console.error(`OpenAI WebSocket error for ${sessionId}:`, error);
      connection.socket.send(JSON.stringify({
        type: 'error',
        error: { message: 'OpenAI connection error' }
      }));
    };

  } catch (error) {
    console.error('Error connecting to OpenAI:', error);
    throw error;
  }
}

async function handleClientMessage(sessionId: string, data: string) {
  const connection = connections.get(sessionId);
  if (!connection || !connection.openaiSocket) return;

  try {
    const message = JSON.parse(data);
    console.log(`Client message for ${sessionId}:`, message.type);

    // Forward appropriate messages to OpenAI
    if (message.type === 'input_audio_buffer.append' || 
        message.type === 'conversation.item.create' ||
        message.type === 'response.create') {
      connection.openaiSocket.send(data);
    }
  } catch (error) {
    console.error('Error handling client message:', error);
  }
}

async function handleOpenAIMessage(sessionId: string, data: string) {
  const connection = connections.get(sessionId);
  if (!connection) return;

  try {
    const event = JSON.parse(data);
    console.log(`OpenAI event for ${sessionId}:`, event.type);

    // Handle different event types
    switch (event.type) {
      case 'response.audio_transcript.delta':
        // Accumulate AI speech transcript
        if (!connection.pendingQuestions) {
          connection.pendingQuestions = [];
        }
        break;
      
      case 'response.audio_transcript.done':
        // AI finished speaking, save transcript and track questions
        if (event.transcript?.trim()) {
          const aiMessage = {
            role: 'assistant',
            content: event.transcript.trim(),
            timestamp: new Date().toISOString()
          };
          
          connection.messages.push(aiMessage);
          await updateChatHistory(sessionId);
          
          // Track questions from AI response
          await trackQuestionsFromResponse(
            event.transcript.trim(),
            connection.userId,
            connection.bookId,
            connection.conversationType,
            connection.chapterId,
            sessionId
          );
        }
        break;
      
      case 'conversation.item.input_audio_transcription.completed':
        // User finished speaking, save their transcript
        if (event.transcript?.trim()) {
          const userMessage = {
            role: 'user',
            content: event.transcript.trim(),
            timestamp: new Date().toISOString()
          };
          
          connection.messages.push(userMessage);
          await updateChatHistory(sessionId);
        }
        break;
    }

    // Forward all events to client
    connection.socket.send(data);
  } catch (error) {
    console.error('Error handling OpenAI message:', error);
  }
}

async function createChatHistoryEntry(
  userId: string, 
  bookId: string, 
  chapterId: string | undefined, 
  sessionId: string, 
  conversationType: string
) {
  try {
    const { error } = await supabase
      .from('chat_histories')
      .insert({
        user_id: userId,
        chapter_id: chapterId,
        session_id: sessionId,
        conversation_type: conversationType,
        conversation_medium: 'voice',
        messages: [],
        context_snapshot: {},
        conversation_goals: generateConversationGoals(conversationType)
      });

    if (error) {
      console.error('Error creating chat history:', error);
      throw error;
    }

    console.log('Voice chat history entry created successfully');
  } catch (error) {
    console.error('Error creating chat history:', error);
    throw error;
  }
}

async function updateChatHistory(sessionId: string) {
  const connection = connections.get(sessionId);
  if (!connection) return;

  try {
    console.log(`Updating chat history for ${sessionId} with ${connection.messages.length} messages`);
    
    const { error } = await supabase
      .from('chat_histories')
      .update({
        messages: connection.messages,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', connection.userId);

    if (error) {
      console.error('Error updating chat history:', error);
    } else {
      console.log('Voice chat history updated successfully');
    }
  } catch (error) {
    console.error('Error updating chat history:', error);
  }
}

async function trackQuestionsFromResponse(
  responseText: string,
  userId: string,
  bookId: string,
  conversationType: string,
  chapterId?: string,
  sessionId?: string
) {
  try {
    console.log('Tracking questions from voice response:', responseText.length, 'characters');
    
    // Extract questions using database function
    const { data: questions, error: extractError } = await supabase.rpc('extract_questions_from_text', {
      response_text: responseText
    });

    if (extractError) {
      console.error('Error extracting questions:', extractError);
      return;
    }

    if (!questions || questions.length === 0) {
      console.log('No questions found in response');
      return;
    }

    console.log(`Found ${questions.length} questions in voice response`);

    // Process each question
    for (const questionText of questions) {
      try {
        // Check if question is duplicate
        const { data: isDuplicate, error: duplicateError } = await supabase.rpc('is_question_duplicate', {
          p_user_id: userId,
          p_book_id: bookId,
          p_conversation_type: conversationType,
          p_question_text: questionText
        });

        if (duplicateError) {
          console.error('Error checking duplicate:', duplicateError);
          continue;
        }

        // Only save if not a duplicate
        if (!isDuplicate) {
          // Generate hash and keywords
          const { data: hash } = await supabase.rpc('generate_question_hash', {
            question_text: questionText
          });

          const { data: keywords } = await supabase.rpc('extract_question_keywords', {
            question_text: questionText
          });

          // Save question
          const { error: saveError } = await supabase
            .from('conversation_questions')
            .insert({
              user_id: userId,
              book_id: bookId,
              chapter_id: chapterId,
              conversation_session_id: sessionId,
              conversation_type: conversationType,
              question_text: questionText,
              question_hash: hash || '',
              semantic_keywords: keywords || []
            });

          if (saveError) {
            console.error('Error saving question:', saveError);
          } else {
            console.log('Successfully tracked question from voice response');
          }
        }
      } catch (error) {
        console.error('Error processing question:', error);
      }
    }
  } catch (error) {
    console.error('Error tracking questions from voice response:', error);
  }
}

function generateConversationGoals(conversationType: string): string[] {
  switch (conversationType) {
    case 'interview':
      return [
        'Gather specific life stories and experiences through voice conversation',
        'Explore key relationships and influences naturally',
        'Document important life events chronologically',
        'Capture personal growth and learning moments'
      ];
    case 'reflection':
      return [
        'Explore deeper meanings and life lessons through dialogue',
        'Understand personal values and beliefs',
        'Reflect on life changes and transformations',
        'Connect past experiences to current wisdom'
      ];
    case 'brainstorming':
      return [
        'Generate creative story ideas and themes verbally',
        'Identify unique personal experiences through discussion',
        'Explore different narrative perspectives',
        'Develop compelling chapter concepts together'
      ];
    default:
      return ['Engage in meaningful voice conversation about life experiences'];
  }
}

function buildInstructions(conversationType: string): string {
  let baseInstructions = `You are a compassionate life coach and autobiography assistant helping someone document their life story through voice conversation. Your role is to engage in thoughtful, natural dialogue that draws out meaningful stories and experiences.

Be warm, empathetic, and genuinely interested. Ask open-ended questions that encourage storytelling and help the person explore emotions and meanings behind events. Keep responses conversational and personal, as if you're having a friendly chat.

Since this is a voice conversation, speak naturally and don't worry about perfect grammar. Use conversational fillers and natural speech patterns. Ask follow-up questions based on what you hear.`;

  if (conversationType) {
    baseInstructions += `\n\nConversation Type: ${conversationType}`;
    
    switch (conversationType) {
      case 'interview':
        baseInstructions += `\nFocus on gathering specific life stories and experiences through natural questioning. Explore key relationships and influences. Help document important life events chronologically by asking about different time periods.`;
        break;
      case 'reflection':
        baseInstructions += `\nExplore deeper meanings and life lessons through thoughtful dialogue. Help understand personal values and beliefs. Encourage reflection on life changes and transformations.`;
        break;
      case 'brainstorming':
        baseInstructions += `\nGenerate creative story ideas and themes through collaborative discussion. Help identify unique personal experiences. Explore different narrative perspectives together.`;
        break;
    }
  }

  return baseInstructions;
}

function cleanup(sessionId: string) {
  const connection = connections.get(sessionId);
  if (connection) {
    // Save final state before cleanup
    if (connection.messages.length > 0) {
      updateChatHistory(sessionId);
    }
    
    // Close OpenAI connection
    if (connection.openaiSocket) {
      connection.openaiSocket.close();
    }
    
    connections.delete(sessionId);
  }
  console.log(`Cleaned up connection: ${sessionId}`);
}