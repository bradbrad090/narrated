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

    const { userId, bookId, chapterId, conversationHistory } = await req.json();

    if (!userId || !bookId || !chapterId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating summary for:', { userId, bookId, chapterId });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let summaryPrompt: string;
    let chapterTitle = '';
    let finalConversationHistory = conversationHistory;

    // Check if conversation history is provided
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      // If no conversation history, fetch saved conversations for this chapter
      const { data: chatHistories, error: chatError } = await supabase
        .from('chat_histories')
        .select('messages')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (chatError) {
        console.error('Error fetching chat histories:', chatError);
        return new Response(JSON.stringify({ error: 'Failed to fetch conversations' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!chatHistories || chatHistories.length === 0) {
        return new Response(JSON.stringify({ error: 'No conversations found for this chapter. Please have a conversation first before generating a summary.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Combine all conversation messages from all chat histories
      const allMessages = [];
      for (const history of chatHistories) {
        if (history.messages && Array.isArray(history.messages)) {
          allMessages.push(...history.messages);
        }
      }

      if (allMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'No conversation messages found for this chapter.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      finalConversationHistory = allMessages;
    }

    // Get chapter title
    const { data: chapter } = await supabase
      .from('chapters')
      .select('title')
      .eq('id', chapterId)
      .eq('user_id', userId)
      .single();

    chapterTitle = chapter?.title || 'Chapter';
    
    const conversationText = finalConversationHistory
      .map(msg => `${msg.role === 'assistant' ? 'AI' : 'User'}: ${msg.content}`)
      .join('\n');

    summaryPrompt = `Create a bullet-point summary based on the following conversation about a life story chapter. Focus on the key life events, experiences, and stories shared by the user. Use concise bullet points that capture objective events and experiences in timeline format.

Chapter Title: ${chapterTitle}
Conversation:
${conversationText}

Summary:`;

    console.log('Generating summary for:', chapterTitle);

    console.log('Calling OpenAI for summary generation...');

    // Call OpenAI API for summary
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a text summary tool that condenses input text into concise bullet points. Capture objective events and characters in a timeline format, avoiding narrative retelling. Exclude unnecessary words, avoid em dashes, and be direct to convey the story\'s essence in minimal words for clear user understanding.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();

    console.log('Summary generated, length:', summary.length);

    // Update chapter with summary
    const { error: updateError } = await supabase
      .from('chapters')
      .update({ summary })
      .eq('id', chapterId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update chapter with summary:', updateError);
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
    console.error('Error in generate-summary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});