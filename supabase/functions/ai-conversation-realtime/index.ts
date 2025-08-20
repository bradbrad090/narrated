import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (request: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client
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
      context 
    } = await request.json();
    
    if (!userId || !bookId) {
      return new Response(JSON.stringify({ error: "userId and bookId are required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('AI Conversation Request:', { action, sessionId, userId, conversationType });

    if (action === 'start_session') {
      return await startConversationSession(supabaseClient, {
        userId,
        bookId,
        chapterId,
        conversationType,
        context
      });
    } else if (action === 'send_message') {
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
        conversationType
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use 'start_session' or 'send_message'" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in ai-conversation-realtime function:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

async function startConversationSession(supabaseClient: any, params: any) {
  const { userId, bookId, chapterId, conversationType, context } = params;
  
  // Generate a unique session ID
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create initial conversation goals based on type
  const conversationGoals = generateConversationGoals(conversationType);
  
  // Create chat history entry
  const { data: chatHistory, error: chatError } = await supabaseClient
    .from('chat_histories')
    .insert({
      user_id: userId,
      session_id: sessionId,
      conversation_type: conversationType,
      context_snapshot: context || {},
      conversation_goals: conversationGoals,
      chapter_id: chapterId,
      messages: []
    })
    .select()
    .single();

  if (chatError) {
    console.error('Error creating chat history:', chatError);
    throw new Error('Failed to start conversation session');
  }

  // Generate initial AI greeting based on context and type
  const initialPrompt = buildInitialPrompt(context, conversationType);
  const aiResponse = await callOpenAI(initialPrompt, []);

  // Update chat history with initial message
  const initialMessages = [
    {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    }
  ];

  await supabaseClient
    .from('chat_histories')
    .update({ messages: initialMessages })
    .eq('id', chatHistory.id);

  console.log('Conversation session started:', sessionId);

  return new Response(JSON.stringify({
    sessionId,
    response: aiResponse,
    conversationType,
    goals: conversationGoals
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processConversationMessage(supabaseClient: any, params: any) {
  const { sessionId, message, userId, context, conversationType } = params;

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
  const conversationHistory = updatedMessages.slice(-10); // Keep last 10 messages for context
  const prompt = buildConversationPrompt(context, conversationType, conversationHistory);
  
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function callOpenAI(prompt: string, conversationHistory: any[]): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  const messages = [
    { role: "system", content: prompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  console.log('Calling OpenAI with message count:', messages.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: messages,
        max_completion_tokens: 500,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    clearTimeout(timeoutId);
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

function buildInitialPrompt(context: any, conversationType: string): string {
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

Start the conversation with a warm greeting and an engaging question based on their profile.`;

  return basePrompt;
}

function buildConversationPrompt(context: any, conversationType: string, messages: any[]): string {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  return `You are a compassionate life coach helping document life stories. 

Context: ${JSON.stringify(context, null, 2)}
Type: ${conversationType}
Last user message: "${lastUserMessage}"

Respond naturally and ask engaging follow-up questions. Keep responses warm and conversational (2-3 sentences). Always end with a question that encourages more storytelling.`;
}

serve(handler);