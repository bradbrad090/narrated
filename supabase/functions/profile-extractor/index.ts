import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { conversationText, conversationTextForProcessing, userId, bookId } = await req.json();

    // Validate required parameters
    if (!userId || !bookId) {
      console.error('Missing required parameters:', { userId, bookId });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: userId and bookId are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Check if OpenAI API key is configured
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('Processing profile extraction for user:', userId, 'book:', bookId);

    // Create a detailed extraction prompt
    const extractionPrompt = `You are an expert at extracting structured biographical information from conversational text. 

Analyze the following conversation and extract relevant personal information to populate an autobiography profile. Return a JSON object with the following structure:

{
  "full_name": "string or null",
  "nicknames": ["array of strings or empty array"],
  "birthplace": "string or null", 
  "birth_year": "integer or null",
  "birth_date": "YYYY-MM-DD format string or null",
  "current_location": "string or null",
  "occupation": "string or null",
  "first_job": "string or null",
  "education": "string or null",
  "siblings_count": "integer or null",
  "parents_occupations": "string or null",
  "marital_status": "string or null",
  "children_count": "integer or null",
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
${conversationTextForProcessing || conversationText}

Return only the JSON object, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process with OpenAI API',
          details: errorData 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const aiResponse = await response.json();
    console.log('OpenAI response:', aiResponse);

    if (!aiResponse.choices || !aiResponse.choices[0] || !aiResponse.choices[0].message) {
      console.error('Invalid OpenAI response structure:', aiResponse);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response from AI service' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Parse the AI response
    let extractedData;
    try {
      const aiResponseContent = aiResponse.choices[0].message.content.trim();
      console.log('AI response content:', aiResponseContent);
      
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = aiResponseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponseContent;
      
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw AI response:', aiResponse.choices[0].message.content);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse AI response as valid JSON',
          details: aiResponse.choices[0].message.content 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // First, store individual question responses if provided
    if (Array.isArray(conversationText)) {
      // If conversationText is an array of Q&A pairs, store them individually
      for (let i = 0; i < conversationText.length; i++) {
        const qa = conversationText[i];
        if (qa.question && qa.answer) {
          await supabase
            .from('profile_question_responses')
            .upsert({
              user_id: userId,
              book_id: bookId,
              question_index: i,
              question_text: qa.question,
              answer_text: qa.answer,
              updated_at: new Date().toISOString()
            });
        }
      }
    }

    // Store the extracted profile data in the database
    const { data: existingProfile, error: fetchError } = await supabase
      .from('book_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing profile:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch existing profile',
          details: fetchError.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    let profileResult;
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('book_profiles')
        .update({
          ...extractedData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .select()
        .single();
      
      profileResult = { data, error };
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('book_profiles')
        .insert({
          user_id: userId,
          book_id: bookId,
          ...extractedData
        })
        .select()
        .single();
      
      profileResult = { data, error };
    }

    if (profileResult.error) {
      console.error('Error saving profile to database:', profileResult.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to save profile to database',
          details: profileResult.error.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('Profile extraction completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: profileResult.data,
        extractedData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Unexpected error in profile extraction:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Profile extraction failed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});