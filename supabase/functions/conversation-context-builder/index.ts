import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContextSnapshot {
  userProfile: any;
  bookProfile: any;
  currentChapter: any;
  recentChapters: any[];
  lifeThemes: string[];
  goals: string[];
}

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

    const { userId, bookId, chapterId, conversationType = 'interview' } = await request.json();
    
    if (!userId || !bookId) {
      return new Response(JSON.stringify({ error: "userId and bookId are required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Building context for user:', userId, 'book:', bookId, 'chapter:', chapterId);

    // Check cache first
    const { data: cachedContext } = await supabaseClient
      .from('conversation_context_cache')
      .select('context_data')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('chapter_id', chapterId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedContext) {
      console.log('Using cached context');
      return new Response(JSON.stringify(cachedContext.context_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const errors: string[] = [];
    
    // Fetch user profile
    const { data: userProfile, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      errors.push('Failed to fetch user profile');
    }

    // Fetch book profile
    const { data: bookProfile, error: bookError } = await supabaseClient
      .from('book_profiles')
      .select('*')
      .eq('book_id', bookId)
      .eq('user_id', userId)
      .single();

    if (bookError) {
      console.error('Error fetching book profile:', bookError);
      errors.push('Failed to fetch book profile');
    }

    // Fetch current chapter if specified
    let currentChapter = null;
    if (chapterId) {
      const { data: chapter, error: chapterError } = await supabaseClient
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .eq('user_id', userId)
        .single();

      if (chapterError) {
        console.error('Error fetching current chapter:', chapterError);
        errors.push('Failed to fetch current chapter');
      } else {
        currentChapter = chapter;
      }
    }

    // Fetch recent chapters (last 3)
    const { data: recentChapters, error: chaptersError } = await supabaseClient
      .from('chapters')
      .select('id, title, content, chapter_number')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3);

    if (chaptersError) {
      console.error('Error fetching recent chapters:', chaptersError);
      errors.push('Failed to fetch recent chapters');
    }

    // Build context snapshot
    const contextSnapshot: ContextSnapshot = {
      userProfile: userProfile || {},
      bookProfile: bookProfile || {},
      currentChapter: currentChapter || {},
      recentChapters: recentChapters || [],
      lifeThemes: bookProfile?.life_themes || [],
      goals: []
    };

    // Generate conversation seeds based on context and type
    const seeds = generateConversationSeeds(contextSnapshot, conversationType);

    // Limit context size to 10,000 characters
    const contextString = JSON.stringify(contextSnapshot);
    const truncatedContext = contextString.length > 10000 
      ? contextString.substring(0, 10000) + '...[truncated]'
      : contextString;

    const response = {
      context: JSON.parse(truncatedContext),
      seeds,
      errors: errors.length > 0 ? errors : undefined
    };

    // Cache the result
    try {
      await supabaseClient
        .from('conversation_context_cache')
        .insert({
          user_id: userId,
          book_id: bookId,
          chapter_id: chapterId,
          context_data: response
        });
      console.log('Context cached successfully');
    } catch (cacheError) {
      console.error('Failed to cache context:', cacheError);
    }

    return new Response(JSON.stringify(response), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in conversation-context-builder function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      context: {},
      seeds: [],
      errors: ['Failed to build conversation context']
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

function generateConversationSeeds(context: ContextSnapshot, type: string): string[] {
  const { userProfile, bookProfile, currentChapter, lifeThemes } = context;
  const seeds: string[] = [];

  if (type === 'interview') {
    seeds.push(
      `Tell me about a typical day in your life when you were ${userProfile.age || 'younger'}.`,
      `What was the most important lesson you learned from your ${bookProfile.occupation || 'work'}?`,
      `Describe a moment when you felt most proud of yourself.`
    );
    
    if (lifeThemes && lifeThemes.length > 0) {
      seeds.push(`I see that ${lifeThemes[0]} is important to you. Can you share a story about that?`);
    }
    
    if (currentChapter && currentChapter.title) {
      seeds.push(`Let's talk about ${currentChapter.title}. What memories come to mind?`);
    }
  } else if (type === 'reflection') {
    seeds.push(
      `Looking back, what would you tell your younger self?`,
      `What values have guided you throughout your life?`,
      `How have your perspectives changed over the years?`
    );
    
    if (bookProfile.challenges_overcome && bookProfile.challenges_overcome.length > 0) {
      seeds.push(`You mentioned overcoming ${bookProfile.challenges_overcome[0]}. How did that experience shape you?`);
    }
  } else if (type === 'brainstorming') {
    seeds.push(
      `What stories from your life do you think would surprise people?`,
      `If you had to choose three words to describe your life journey, what would they be?`,
      `What chapter of your life story feels most important to preserve?`
    );
  }

  return seeds.slice(0, 4); // Return max 4 seeds
}

serve(handler);