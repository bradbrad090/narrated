import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
    if (!XAI_API_KEY) {
      throw new Error('XAI_API_KEY is not set');
    }

    const { prompt, userId, bookId } = await req.json();

    console.log('Generating autobiography content for user:', userId, 'book:', bookId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call xAI API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-latest',
        messages: [
          {
            role: 'system',
            content: `You are a professional autobiography writer and editor. Help users write compelling, authentic autobiography content. When users provide voice transcriptions or rough text, clean up grammar, punctuation, and sentence structure while preserving their authentic voice and meaning. Focus on creating engaging narratives that capture personal experiences, emotions, and life lessons. Write in first person and maintain a conversational yet literary tone. Each response should be substantial (300-800 words) and well-structured with clear paragraphs.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('xAI API error:', error);
      throw new Error(`xAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated content length:', generatedContent.length);

    // Update the book with the new content
    const { error: updateError } = await supabase
      .from('books')
      .update({
        chapters: generatedContent,
        status: 'in_progress'
      })
      .eq('id', bookId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating book:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true,
      content: generatedContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-autobiography function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});