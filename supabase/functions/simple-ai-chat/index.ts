import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const handler = async (request: Request): Promise<Response> => {
  console.log('=== SIMPLE AI CHAT FUNCTION ===');
  
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
    // Parse request body
    const requestBody = await request.json();
    console.log('Request received:', requestBody);
    
    const { userId, bookId, message = "Hello! I'd like to start documenting my life story. Can you help me begin?" } = requestBody;
    
    if (!userId || !bookId) {
      return new Response(JSON.stringify({ error: "userId and bookId are required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Making OpenAI request...');
    
    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are a compassionate life coach helping someone document their life story. Be warm, empathetic, and ask engaging questions that encourage storytelling. Keep responses to 2-3 sentences and always end with a thoughtful question."
          },
          {
            role: "user",
            content: message
          }
        ],
        max_completion_tokens: 500,
        temperature: 0.8
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: `OpenAI API error: ${errorText}` }), { 
        status: openaiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await openaiResponse.json();
    const aiMessage = aiData.choices[0]?.message?.content?.trim();
    
    if (!aiMessage) {
      return new Response(JSON.stringify({ error: "No response from AI" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('AI response received successfully');

    // Generate session ID
    const sessionId = `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: request.headers.get('Authorization') || '' },
        },
      }
    );

    // Save to database
    try {
      await supabaseClient
        .from('chat_histories')
        .insert({
          user_id: userId,
          session_id: sessionId,
          conversation_type: 'interview',
          context_snapshot: {},
          conversation_goals: ['Start documenting life story'],
          messages: [
            {
              role: 'user',
              content: message,
              timestamp: new Date().toISOString()
            },
            {
              role: 'assistant',
              content: aiMessage,
              timestamp: new Date().toISOString()
            }
          ]
        });
      
      console.log('Conversation saved to database');
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue anyway - at least return the AI response
    }

    return new Response(JSON.stringify({
      sessionId,
      response: aiMessage,
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in simple-ai-chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);