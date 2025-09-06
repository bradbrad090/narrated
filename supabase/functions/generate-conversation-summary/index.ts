import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration not found');
    }

    const { conversationId, userId } = await req.json();

    if (!conversationId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating summary for conversation:', { conversationId, userId });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch conversation messages
    const { data: conversation, error: conversationError } = await supabase
      .from('chat_histories')
      .select('messages, conversation_type, is_self_conversation')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (conversationError || !conversation) {
      console.error('Conversation fetch error:', conversationError);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!conversation.messages || conversation.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages to summarize' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Conversation found with', conversation.messages.length, 'messages');

    // Extract meaningful content from messages
    const messageTexts = conversation.messages
      .filter((msg: any) => msg.content && msg.content.trim().length > 0)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .slice(0, 10); // Limit to first 10 messages for efficiency

    const conversationContent = messageTexts.join('\n');

    // Determine conversation type for context
    const conversationType = conversation.is_self_conversation 
      ? 'self-reflection' 
      : conversation.conversation_type || 'interview';

    // Create summary prompt
    const summaryPrompt = `Create a concise 15-word summary of this ${conversationType} conversation. Focus on the main topics discussed and key themes. Be specific and informative.

Conversation:
${conversationContent}

Summary (exactly 15 words):`;

    console.log('Calling OpenAI for summary generation...');

    // Call OpenAI API for summary
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are a text summarization expert. Create exactly 15-word summaries that capture the essence of conversations. Be concise, specific, and informative.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        max_completion_tokens: 50
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let summary = data.choices[0].message.content.trim();

    // Ensure summary is approximately 15 words
    const words = summary.split(' ');
    if (words.length > 18) {
      summary = words.slice(0, 15).join(' ') + '...';
    }

    console.log('Summary generated:', summary);

    // Update conversation with summary
    const { error: updateError } = await supabase
      .from('chat_histories')
      .update({ summary })
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update conversation with summary:', updateError);
      throw new Error('Failed to save summary');
    }

    console.log('Summary saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      message: 'Summary generated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-conversation-summary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});