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

    const { conversationText, userId, bookId } = await request.json();
    
    if (!conversationText || !userId || !bookId) {
      return new Response(JSON.stringify({ error: "conversationText, userId, and bookId are required" }), { 
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

    console.log('Processing profile extraction for user:', userId, 'book:', bookId);

    // Create a detailed extraction prompt
    const extractionPrompt = `You are an expert at extracting structured biographical information from conversational text. 

Analyze the following conversation and extract relevant personal information to populate an autobiography profile. Return a JSON object with the following structure:

{
  "full_name": "string or null",
  "birthplace": "string or null", 
  "birth_year": "integer or null",
  "current_location": "string or null",
  "occupation": "string or null",
  "education": "string or null",
  "family_background": "string or null",
  "cultural_background": "string or null", 
  "languages_spoken": ["array of strings or empty array"],
  "hobbies_interests": ["array of strings or empty array"],
  "personality_traits": ["array of strings or empty array"],
  "life_themes": ["array of strings or empty array"],
  "values_beliefs": "string or null",
  "key_life_events": ["array of strings or empty array"],
  "challenges_overcome": ["array of strings or empty array"],
  "career_highlights": ["array of strings or empty array"],
  "memorable_quotes": ["array of strings or empty array"],
  "writing_style_preference": "conversational, formal, or poetic"
}

Rules:
1. Only extract information that is explicitly mentioned or clearly implied
2. Use null for missing information, don't make assumptions
3. Keep arrays empty if no relevant information is found
4. For life_themes, extract 3-5 major themes that seem important to this person
5. For writing_style_preference, infer from how they speak: casual = conversational, sophisticated = formal, creative = poetic
6. Be accurate and avoid hallucinating information not present in the text

Conversation to analyze:
${conversationText}

Return only the JSON object, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: "You are an expert biographical information extractor. Always return valid JSON." },
          { role: "user", content: extractionPrompt }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;
    
    console.log('Raw OpenAI response:', extractedText);

    // Parse the JSON response
    let profileData;
    try {
      profileData = JSON.parse(extractedText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Fallback: try to extract JSON from the response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        profileData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to extract valid JSON from OpenAI response');
      }
    }

    console.log('Extracted profile data:', profileData);

    // Update or create the book profile
    const { data: existingProfile } = await supabaseClient
      .from('book_profiles')
      .select('*')
      .eq('book_id', bookId)
      .eq('user_id', userId)
      .single();

    let updatedProfile;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabaseClient
        .from('book_profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating book profile:', error);
        throw new Error('Failed to update book profile');
      }
      updatedProfile = data;
    } else {
      // Create new profile
      const { data, error } = await supabaseClient
        .from('book_profiles')
        .insert({
          book_id: bookId,
          user_id: userId,
          ...profileData
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating book profile:', error);
        throw new Error('Failed to create book profile');
      }
      updatedProfile = data;
    }

    console.log('Profile updated successfully:', updatedProfile.id);

    return new Response(JSON.stringify({
      success: true,
      profile: updatedProfile,
      extractedData: profileData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in profile-extractor function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to extract profile from conversation'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);