import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get allowed origins from environment or default to localhost for development
const getAllowedOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://keadkwromhlyvoyxvcmi.supabase.co',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-production-domain.com' // Replace with actual domain
  ];
  
  return allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (request: Request): Promise<Response> => {
  console.log('=== AI Conversation Realtime Handler Started ===');
  console.log('Method:', request.method);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    console.log('Invalid method:', request.method);
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    console.log('Parsing request body...');
    const requestBody = await request.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: request.headers.get('Authorization')! },
        },
      }
    );
    const { 
      action, 
      sessionId, 
      message, 
      userId, 
      bookId, 
      chapterId,
      conversationType = 'interview',
      context,
      styleInstructions,
      conversationHistory
    } = requestBody;
    
    console.log('Extracted parameters:', { 
      action, 
      sessionId, 
      message, 
      userId, 
      bookId, 
      chapterId, 
      conversationType,
      hasContext: !!context,
      styleInstructions 
    });
    
    if (!userId || !bookId) {
      console.error('Missing required parameters:', { 
        userId: userId || 'MISSING', 
        bookId: bookId || 'MISSING' 
      });
      return new Response(JSON.stringify({ 
        error: "userId and bookId are required",
        received: { userId: !!userId, bookId: !!bookId }
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log('OpenAI API Key present:', !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('AI Conversation Request:', { action, sessionId, userId, conversationType });

    if (action === 'start_session') {
      console.log('Starting conversation session...');
      return await startConversationSession(supabaseClient, {
        userId,
        bookId,
        chapterId,
        conversationType,
        context,
        styleInstructions
      });
    } else if (action === 'send_message') {
      console.log('Sending message...');
      if (!sessionId || !message) {
        return new Response(JSON.stringify({ error: "sessionId and message are required for send_message" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return await processConversationMessage(supabaseClient, {
        sessionId,
        message,
        userId,
        context,
        conversationType,
        styleInstructions
      });
    } else if (action === 'continue_conversation') {
      console.log('Continuing conversation...');
      if (!sessionId || !message) {
        return new Response(JSON.stringify({ error: "sessionId and message are required for continue_conversation" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return await processConversationMessage(supabaseClient, {
        sessionId,
        message,
        userId,
        context,
        conversationType,
        styleInstructions,
        isResumedConversation: true,
        fullConversationHistory: conversationHistory
      });
    } else {
      console.error('Invalid action:', action);
      return new Response(JSON.stringify({ error: "Invalid action. Use 'start_session', 'send_message', or 'continue_conversation'" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in ai-conversation-realtime function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack || 'No stack trace available'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

async function startConversationSession(supabaseClient: any, params: any) {
  console.log('=== Starting Conversation Session ===');
  console.log('Params:', JSON.stringify(params, null, 2));
  
  const { userId, bookId, chapterId, conversationType, context, styleInstructions } = params;
  
  try {
    // Generate a unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated session ID:', sessionId);
    
    // Create initial conversation goals based on type
    const conversationGoals = generateConversationGoals(conversationType);
    console.log('Conversation goals:', conversationGoals);
    
    // Generate initial AI greeting FIRST - don't create database record until we know OpenAI works
    const initialPrompt = buildInitialPrompt(context, conversationType, styleInstructions);
    console.log('Generated initial prompt:', initialPrompt);
    
    const aiResponse = await callOpenAI(initialPrompt, []);
    console.log('AI initial response received successfully');

    // Only create chat history entry AFTER successful OpenAI response
    console.log('Creating chat history entry after successful OpenAI response...');
    const { data: chatHistory, error: chatError } = await supabaseClient
      .from('chat_histories')
      .insert({
        user_id: userId,
        session_id: sessionId,
        conversation_type: conversationType,
        context_snapshot: context || {},
        conversation_goals: conversationGoals,
        chapter_id: chapterId,
        messages: [{
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }]
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating chat history:', chatError);
      throw new Error('Failed to create conversation session');
    }
    console.log('Chat history created successfully:', chatHistory);

    console.log('Conversation session started successfully:', sessionId);

    return new Response(JSON.stringify({
      sessionId,
      response: aiResponse,
      conversationType,
      goals: conversationGoals
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in startConversationSession:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to start conversation session',
      details: error.stack || 'No stack trace available'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function processConversationMessage(supabaseClient: any, params: any) {
  const { sessionId, message, userId, context, conversationType, styleInstructions, isResumedConversation = false, fullConversationHistory = null } = params;

  // Fetch existing conversation
  const { data: chatHistory, error: fetchError } = await supabaseClient
    .from('chat_histories')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !chatHistory) {
    console.error('Error fetching chat history:', fetchError);
    throw new Error('Conversation session not found');
  }

  // Add user message to history
  const existingMessages = chatHistory.messages || [];
  const userMessage = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };

  const updatedMessages = [...existingMessages, userMessage];

  // Generate AI response with retry logic
  // For resumed conversations, use full history; for new ones, keep last 10 messages
  const conversationHistory = isResumedConversation && fullConversationHistory 
    ? fullConversationHistory 
    : updatedMessages.slice(-10); // Keep last 10 messages for context
  const prompt = buildConversationPrompt(context, conversationType, conversationHistory, styleInstructions);
  
  let aiResponse;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      aiResponse = await callOpenAI(prompt, conversationHistory);
      break;
    } catch (error) {
      attempts++;
      console.error(`OpenAI call attempt ${attempts} failed:`, error);
      
      if (attempts === maxAttempts) {
        aiResponse = "I apologize, but I'm having trouble responding right now. Could you please rephrase your question or try again?";
      } else {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  // Add AI response to messages
  const aiMessage = {
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString()
  };

  const finalMessages = [...updatedMessages, aiMessage];

  // Update chat history
  await supabaseClient
    .from('chat_histories')
    .update({ 
      messages: finalMessages,
      updated_at: new Date().toISOString()
    })
    .eq('id', chatHistory.id);

  console.log('Message processed for session:', sessionId);

  return new Response(JSON.stringify({
    response: aiResponse,
    sessionId,
    messageCount: finalMessages.length
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function callOpenAI(prompt: string, conversationHistory: any[]): Promise<string> {
  console.log('=== Calling OpenAI ===');
  
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  console.log('OpenAI API Key present:', !!OPENAI_API_KEY);
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    throw new Error('OpenAI API key is not configured');
  }
  
  const messages = [
    { role: "system", content: prompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  console.log('Calling OpenAI with message count:', messages.length);
  console.log('First system message length:', prompt.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    console.log('Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14", // More reliable model
        messages: messages,
        max_completion_tokens: 800, // Increased token limit
        temperature: 0.8 // Add temperature for creative responses
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    const content = data.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error('No content in OpenAI response:', data);
      console.error('Choices array:', data.choices);
      console.error('First choice:', data.choices[0]);
      console.error('Message object:', data.choices[0]?.message);
      throw new Error('No content received from OpenAI - response was empty');
    }
    
    console.log('OpenAI response content length:', content.length);
    return content;

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error in callOpenAI:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

function generateConversationGoals(type: string): string[] {
  switch (type) {
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

function buildInitialPrompt(context: any, conversationType: string, styleInstructions?: string): string {
  const basePrompt = `You are a compassionate life coach and autobiography assistant helping someone document their life story. Your role is to engage in thoughtful conversation that draws out meaningful stories and experiences.

Context about the person:
${JSON.stringify(context, null, 2)}

Conversation Type: ${conversationType}

Guidelines:
- Be warm, empathetic, and genuinely interested
- Ask open-ended questions that encourage storytelling
- Build on previous responses naturally
- Help the person explore emotions and meanings behind events
- Keep responses conversational and personal (2-3 sentences)
- Always end with a thoughtful follow-up question

${styleInstructions ? `RESPONSE STYLE OVERRIDE: ${styleInstructions}` : ''}

Start the conversation with ${styleInstructions ? 'a direct, engaging question based on their profile' : 'a warm greeting and an engaging question based on their profile'}.`;

  return basePrompt;
}

function buildConversationPrompt(context: any, conversationType: string, messages: any[], styleInstructions?: string): string {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  return `You are a compassionate life coach helping document life stories. 

Context: ${JSON.stringify(context, null, 2)}
Type: ${conversationType}
Last user message: "${lastUserMessage}"

${styleInstructions ? `RESPONSE STYLE OVERRIDE: ${styleInstructions}` : 'Respond naturally and ask engaging follow-up questions. Keep responses warm and conversational (2-3 sentences). Always end with a question that encourages more storytelling.'}`;
}

serve(handler);