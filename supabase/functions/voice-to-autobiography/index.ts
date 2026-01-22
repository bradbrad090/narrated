import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate JWT token with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !data?.user) {
      console.warn('Invalid token attempt');
      return new Response(JSON.stringify({ error: "Invalid authentication" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', data.user.id);

    const { audio, systemPrompt } = await req.json();
    
    if (!audio) {
      return new Response(JSON.stringify({ error: "No audio data provided" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: "Service configuration error" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing audio for transcription, user:', data.user.id);

    // Step 1: Transcribe audio to text
    const binaryAudio = processBase64Chunks(audio);
    
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('OpenAI Transcription API error:', errorText);
      return new Response(JSON.stringify({ error: "Unable to transcribe audio" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcribedText = transcriptionResult.text;

    console.log('Transcription completed, transforming to autobiography format...');

    // Step 2: Transform text to autobiography format
    const defaultSystemPrompt = `You are an AI specialized in transforming raw, transcribed spoken narratives into clean, readable autobiographical transcripts. Your sole task is to process voice-to-text input, which consists of unstructured, conversational speech about personal experiences or events. This input may be rambling, incomplete, repetitive, or non-linear, as it comes directly from spoken storytelling without clear structure.

To create the output:

Distill the key elements: Identify main events, characters, emotions, timelines, and themes from the transcript, but keep changes minimal.

Organize into a coherent narrative: Structure it chronologically or thematically as a first-person autobiography, ensuring basic flow without adding elaborate details.

Adopt an autobiographical tone: Write in the first person ("I") with straightforward, reflective language, as if the speaker is recounting their story in a simple memoir.

Enhance for basic readability: Eliminate filler words (e.g., "um," "like"), resolve obvious ambiguities, and use simple sentences to make it readable, but avoid embellishments, vivid descriptions, or filling gaps beyond what's explicitly in the input.

Keep it faithful: Do not add fabricated details, alter facts, or introduce external information; base everything strictly on the input transcript. Treat this as a glorified transcription—cleaned up but close to the original spoken content.

Output length: Match the essence of the input without aiming for a specific word count; keep it concise and natural.

Output format: Respond only with the cleaned autobiographical transcript. Do not include explanations, summaries, or additional commentary.`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: systemPrompt || defaultSystemPrompt
          },
          {
            role: 'user',
            content: transcribedText
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('OpenAI Chat API error:', errorText);
      return new Response(JSON.stringify({ error: "Unable to process text" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const chatResult = await chatResponse.json();
    const autobiographyText = chatResult.choices[0].message.content;

    console.log('Autobiography transformation completed');

    return new Response(
      JSON.stringify({ 
        text: autobiographyText,
        originalTranscript: transcribedText 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voice-to-autobiography function:', error);
    return new Response(
      JSON.stringify({ error: "Unable to process request" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
