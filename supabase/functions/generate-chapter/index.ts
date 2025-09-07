import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    // Parse request body first to ensure it's valid
    const { userId, bookId, chapterId } = await req.json();
    
    console.log('Generating chapter for:', { userId, bookId, chapterId });
    
    // Get XAI API key - will be checked before API call
    const xaiApiKey = Deno.env.get('XAI_API_KEY');

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Fetch user profile, book profile, chapter-specific conversations, current chapter, and all chapters for context
    const [profileResult, conversationResult, chapterResult, allChaptersResult] = await Promise.all([
      supabase
        .from('book_profiles')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId) // Filter conversations by chapter_id
        .order('created_at', { ascending: false })
        .limit(10), // Increased limit since we're now chapter-specific
      supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('chapters')
        .select('id, title, chapter_number, summary, content')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .order('chapter_number', { ascending: true })
    ]);

    if (profileResult.error) {
      console.error('Profile fetch error:', profileResult.error);
    }
    if (conversationResult.error) {
      console.error('Conversation fetch error:', conversationResult.error);
    }
    if (chapterResult.error) {
      throw new Error('Chapter not found');
    }
    if (allChaptersResult.error) {
      console.error('All chapters fetch error:', allChaptersResult.error);
    }

    const profile = profileResult.data;
    const conversations = conversationResult.data || [];
    const chapter = chapterResult.data;
    const allChapters = allChaptersResult.data || [];

    console.log('Data fetched:', { 
      profileExists: !!profile,
      conversationCount: conversations.length,
      chapterTitle: chapter.title,
      chapterSpecificConversations: true,
      totalChaptersCount: allChapters.length
    });

    // Build context for the chapter
    let contextContent = '';
    
    if (profile) {
      contextContent += `Profile Information:\n`;
      if (profile.full_name) contextContent += `Name: ${profile.full_name}\n`;
      if (profile.birthplace) contextContent += `Birthplace: ${profile.birthplace}\n`;
      if (profile.birth_year) contextContent += `Birth Year: ${profile.birth_year}\n`;
      if (profile.current_location) contextContent += `Current Location: ${profile.current_location}\n`;
      if (profile.occupation) contextContent += `Occupation: ${profile.occupation}\n`;
      if (profile.education) contextContent += `Education: ${profile.education}\n`;
      if (profile.family_background) contextContent += `Family Background: ${profile.family_background}\n`;
      if (profile.cultural_background) contextContent += `Cultural Background: ${profile.cultural_background}\n`;
      if (profile.relationships_family) contextContent += `Relationships/Family: ${profile.relationships_family}\n`;
      if (profile.values_beliefs) contextContent += `Values/Beliefs: ${profile.values_beliefs}\n`;
      if (profile.life_philosophy) contextContent += `Life Philosophy: ${profile.life_philosophy}\n`;
      
      if (profile.personality_traits?.length) {
        contextContent += `Personality Traits: ${profile.personality_traits.join(', ')}\n`;
      }
      if (profile.hobbies_interests?.length) {
        contextContent += `Hobbies/Interests: ${profile.hobbies_interests.join(', ')}\n`;
      }
      if (profile.key_life_events?.length) {
        contextContent += `Key Life Events: ${profile.key_life_events.join(', ')}\n`;
      }
      if (profile.career_highlights?.length) {
        contextContent += `Career Highlights: ${profile.career_highlights.join(', ')}\n`;
      }
      if (profile.challenges_overcome?.length) {
        contextContent += `Challenges Overcome: ${profile.challenges_overcome.join(', ')}\n`;
      }
      if (profile.life_themes?.length) {
        contextContent += `Life Themes: ${profile.life_themes.join(', ')}\n`;
      }
      if (profile.memorable_quotes?.length) {
        contextContent += `Memorable Quotes: ${profile.memorable_quotes.join(', ')}\n`;
      }
      if (profile.languages_spoken?.length) {
        contextContent += `Languages Spoken: ${profile.languages_spoken.join(', ')}\n`;
      }
      
      contextContent += '\n';
    }

    // Add conversation history (chapter-specific)
    if (conversations.length > 0) {
      contextContent += `Conversation History for this Chapter:\n`;
      conversations.forEach((conv, index) => {
        if (conv.messages && Array.isArray(conv.messages)) {
          contextContent += `\nConversation ${index + 1} (${conv.conversation_type}):\n`;
          conv.messages.forEach((msg: any) => {
            if (msg.role === 'user') {
              contextContent += `User: ${msg.content}\n`;
            } else if (msg.role === 'assistant') {
              contextContent += `Assistant: ${msg.content}\n`;
            }
          });
        }
      });
      contextContent += '\n';
    }

    // Add all chapter summaries for context and continuity
    if (allChapters.length > 0) {
      contextContent += `Existing Chapters Overview (for context and continuity):\n`;
      allChapters.forEach((ch) => {
        contextContent += `Chapter ${ch.chapter_number}: ${ch.title}\n`;
        if (ch.summary) {
          contextContent += `Summary: ${ch.summary}\n`;
        } else if (ch.content && ch.content.length > 200) {
          // If no summary but has content, provide a brief excerpt
          contextContent += `Content excerpt: ${ch.content.substring(0, 200)}...\n`;
        }
        contextContent += '\n';
      });
      contextContent += '\n';
    }

    // Add current chapter context
    contextContent += `Current Chapter Information:\n`;
    contextContent += `Chapter Title: ${chapter.title}\n`;
    contextContent += `Chapter Number: ${chapter.chapter_number}\n`;
    if (chapter.content) {
      contextContent += `Existing Content: ${chapter.content}\n`;
    }

    console.log('Context built, length:', contextContent.length);

    // System prompt updated to include chapter context awareness
    const systemPrompt = `You are an expert autobiography writer specializing in transforming personal conversations and background profiles into cohesive, first-person narrative prose. Your goal is to generate a single chapter of an autobiography based on the provided user profile, chapter-specific conversation history, and existing chapter summaries for context.

Key Guidelines:

1. Write exclusively in the first-person perspective (using "I", "me", "my") as if the user is narrating their own life story.

2. Use only the facts, stories, experiences, and details explicitly mentioned in the provided profile and conversation history. Do not invent, add, or fabricate any new stories, events, people, or details—everything must be grounded in the user's own words and shared information.

3. CHAPTER CONTINUITY: Use the provided chapter summaries to understand what has already been covered in other chapters. Avoid repeating the same stories or details that have been thoroughly explored elsewhere. If a story or event was mentioned in conversations but already covered in another chapter, reference it briefly rather than retelling it in full.

4. SUBTLE CONNECTIONS: Where appropriate and natural, create subtle links to other chapters (e.g., "As I mentioned earlier in my story..." or "This would later connect to..."), but only if the information supports such connections.

5. You may apply slight, reasonable exaggeration for dramatic effect (e.g., emphasizing emotions or the significance of a real event the user described), but only if it enhances the narrative without altering facts.

6. Structure the chapter as engaging narrative prose: Start with an introduction to the chapter's theme, weave in chronological or thematic elements from the conversations, and end with a reflective conclusion. Aim for 800-1500 words, divided into paragraphs with natural flow.

7. Comfort the reader (who is the user) by emphasizing the authenticity: Include subtle reassurances like "Looking back on my own words..." or "As I shared in my reflections..." to remind them this is drawn directly from their real stories.

8. If the conversation history includes multiple exchanges, synthesize them into a unified narrative without quoting dialogues verbatim—paraphrase and integrate naturally.

9. Title the chapter based on its core theme, derived from the provided data (e.g., if the chapter focuses on childhood, title it "My Early Years in [Birthplace]").

10. If any information is missing or insufficient for a full chapter, note it briefly at the end and suggest the user add more details via conversations, but still generate the best possible chapter from what's available.

Output format: Respond only with the autobiography chapter content. Do not include explanations, summaries, or additional commentary beyond the chapter itself.`;

    // Call X AI API with Grok-4 with retry logic
    let generatedContent = '';
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`Generation attempt ${attempts + 1}`);
        
        // Check XAI API key right before using it (handles caching issues)
        if (!xaiApiKey) {
          throw new Error('XAI API key not configured');
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${xaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-4-0709',
            messages: [
              { role: 'system', content: systemPrompt },
              { 
                role: 'user', 
                content: `Please generate an autobiography chapter based on the following information:\n\n${contextContent}`
              }
            ],
            max_tokens: 4000,
            stream: false
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          console.error('xAI API error:', response.status, errorData);
          throw new Error(`xAI API error: ${response.status} ${errorData}`);
        }

        const data = await response.json();
        generatedContent = data.choices[0].message.content;
        
        console.log('Generated content length:', generatedContent.length);
        break;

      } catch (error) {
        attempts++;
        console.error(`Generation attempt ${attempts} failed:`, error);
        
        if (attempts < maxAttempts) {
          // Exponential backoff: 2^attempts * 1000ms
          const delay = Math.pow(2, attempts) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries reached, set error message
          generatedContent = "Failed to generate chapter. Please try again.";
          console.error('Max retries reached for chapter generation');
        }
      }
    }

    // Update the chapter in the database
    const { error: updateError } = await supabase
      .from('chapters')
      .update({ 
        content: generatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', chapterId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to save generated content');
    }

    // Store metadata in ai_chapter_metadata table
    try {
      const sourceData = {
        profile: profile,
        conversations: conversations, // All chapter-specific conversations
        chapter: {
          id: chapter.id,
          title: chapter.title,
          chapter_number: chapter.chapter_number,
          existing_content: chapter.content?.substring(0, 500) // Truncate for storage
        },
        allChapters: allChapters.map(ch => ({
          id: ch.id,
          title: ch.title,
          chapter_number: ch.chapter_number,
          summary: ch.summary,
          contentExcerpt: ch.content?.substring(0, 200)
        }))
      };

      await supabase
        .from('ai_chapter_metadata')
        .insert({
          chapter_id: chapterId,
          user_id: userId,
          book_id: bookId,
          conversation_id: conversations[0]?.id,
          profile_id: profile?.id,
          model_used: 'grok-4-0709',
          prompt_version: 'v1.0',
          source_data: sourceData,
          generated_at: new Date().toISOString()
        });
    } catch (metadataError) {
      console.error('Metadata storage error:', metadataError);
      // Don't fail the entire operation for metadata errors
    }

    console.log('Chapter updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: generatedContent,
        message: 'Chapter generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-chapter function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});