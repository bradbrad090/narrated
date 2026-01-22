import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get allowed origins from environment or default to localhost for development
const getAllowedOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://keadkwromhlyvoyxvcmi.supabase.co',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-production-domain.com' // Replace with actual domain
  ];
  
  return allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (request: Request): Promise<Response> => {
  console.log('=== AI Conversation Realtime Handler Started ===');
  console.log('Method:', request.method);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    console.log('Invalid method:', request.method);
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    console.log('Parsing request body...');
    
    // Validate JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await request.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
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
      context,
      conversationHistory
    } = requestBody;
    
    console.log('Extracted parameters:', { 
      action, 
      sessionId, 
      message, 
      userId, 
      bookId, 
      chapterId, 
      conversationType,
      hasContext: !!context
    });
    
    if (!userId || !bookId) {
      console.error('Missing required parameters:', { 
        userId: userId || 'MISSING', 
        bookId: bookId || 'MISSING' 
      });
      return new Response(JSON.stringify({ 
        error: "userId and bookId are required",
        received: { userId: !!userId, bookId: !!bookId }
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log('OpenAI API Key present:', !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('AI Conversation Request:', { action, sessionId, userId, conversationType });

    if (action === 'start_session') {
      console.log('Starting conversation session...');
      return await startConversationSession(supabaseClient, {
        userId,
        bookId,
        chapterId,
        conversationType,
        context
      });
    } else if (action === 'send_message') {
      console.log('Sending message...');
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
    } else if (action === 'continue_conversation') {
      console.log('Continuing conversation...');
      if (!sessionId || !message) {
        return new Response(JSON.stringify({ error: "sessionId and message are required for continue_conversation" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return await processConversationMessage(supabaseClient, {
        sessionId,
        message,
        userId,
        context,
        conversationType,
        isResumedConversation: true,
        fullConversationHistory: conversationHistory
      });
    } else {
      console.error('Invalid action:', action);
      return new Response(JSON.stringify({ error: "Invalid action. Use 'start_session', 'send_message', or 'continue_conversation'" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in ai-conversation-realtime function:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return new Response(JSON.stringify({ 
      error: 'Unable to process conversation request'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

async function startConversationSession(supabaseClient: any, params: any) {
  console.log('=== Starting Conversation Session ===');
  console.log('Params:', JSON.stringify(params, null, 2));
  
  const { userId, bookId, chapterId, conversationType, context } = params;
  
  try {
    // Generate a unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated session ID:', sessionId);
    
    // Generate initial AI greeting FIRST - don't create database record until we know OpenAI works
    const initialPrompt = buildSystemPrompt(context, true);
    console.log('Generated initial prompt:', initialPrompt);
    
    const aiResponse = await callOpenAI(initialPrompt, []);
    console.log('AI initial response received successfully');

    // Only create chat history entry AFTER successful OpenAI response
    console.log('Creating chat history entry after successful OpenAI response...');
    const { data: chatHistory, error: chatError } = await supabaseClient
      .from('chat_histories')
      .insert({
        user_id: userId,
        session_id: sessionId,
        conversation_type: conversationType,
        context_snapshot: context || {},
        chapter_id: chapterId,
        messages: [{
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }]
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating chat history:', chatError);
      throw new Error('Failed to create conversation session');
    }
    console.log('Chat history created successfully:', chatHistory);

    console.log('Conversation session started successfully:', sessionId);

    return new Response(JSON.stringify({
      sessionId,
      response: aiResponse,
      conversationType
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in startConversationSession:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return new Response(JSON.stringify({ 
      error: 'Unable to start conversation session'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function processConversationMessage(supabaseClient: any, params: any) {
  const { sessionId, message, userId, context, conversationType, isResumedConversation = false, fullConversationHistory = null } = params;

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
  // Use full conversation history provided from frontend for proper context
  const conversationHistory = fullConversationHistory || updatedMessages.slice(-10); // Use provided history or keep last 10 messages for context
  const prompt = buildSystemPrompt(context, false);
  
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
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function callOpenAI(prompt: string, conversationHistory: any[]): Promise<string> {
  console.log('=== Calling OpenAI ===');
  
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  console.log('OpenAI API Key present:', !!OPENAI_API_KEY);
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    throw new Error('OpenAI API key is not configured');
  }
  
  const messages = [
    { role: "system", content: prompt },
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  console.log('Calling OpenAI with message count:', messages.length);
  console.log('First system message length:', prompt.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    console.log('Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14", // More reliable model
        messages: messages,
        max_completion_tokens: 800, // Increased token limit
        temperature: 0.8 // Add temperature for creative responses
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    const content = data.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error('No content in OpenAI response:', data);
      console.error('Choices array:', data.choices);
      console.error('First choice:', data.choices[0]);
      console.error('Message object:', data.choices[0]?.message);
      throw new Error('No content received from OpenAI - response was empty');
    }
    
    console.log('OpenAI response content length:', content.length);
    return content;

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error in callOpenAI:', error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    console.error('Error stack:', errorStack);
    throw error;
  }
}


// Single system prompt builder
function buildSystemPrompt(context: any, isInitial: boolean = true): string {
  const goals = [
    'Gather specific life stories and experiences',
    'Explore key relationships and influences', 
    'Document important life events chronologically',
    'Capture personal growth and learning moments'
  ];

  // Check if current chapter has existing content or summary
  const hasExistingChapterContent = context?.currentChapter?.content || context?.currentChapter?.summary;
  const chapterInfo = context?.currentChapter;

  const basePrompt = `You are an empathetic autobiography interviewer named "LifeStory Guide." Your goal is to gently help novice users with no writing experience and challenging memories document their life story through supportive, low-pressure conversations. Prioritize uncovering meaningful life stories, significant events, relationships, emotions, and personal growth over mundane physical details like colors, materials, or minor objects—only use such specifics as brief entry points to explore broader impacts or narratives.

CURRENT CHAPTER FOCUS:
Title: ${chapterInfo?.title || 'Untitled Chapter'}
${chapterInfo?.summary ? `What's Already Covered: ${chapterInfo.summary}` : 'Status: Just starting this chapter'}

⚠️ CRITICAL: Your FIRST question must directly relate to the chapter title theme above. If this is "Toddler Years," ask about toddler experiences. If it's "Before My Birth," ask about pre-birth family stories. DO NOT ask about unrelated previous chapter content.

Context about the person (REFERENCE ONLY - use for depth, not for first question):
${JSON.stringify(context, null, 2)}

Conversation Goals (align all questions to these):
${JSON.stringify(goals, null, 2)}

${hasExistingChapterContent ? `
IMPORTANT: This chapter already has existing content/summary. Build upon what's already documented rather than starting fresh. Acknowledge the existing information and explore deeper stories, connections, or related experiences that expand on what's already captured.

Current Chapter: ${chapterInfo?.title || 'Current Chapter'}
${chapterInfo?.summary ? `Existing Summary: ${chapterInfo.summary}` : ''}
${chapterInfo?.content ? `Existing Content: ${chapterInfo.content.substring(0, 500)}...` : ''}

Your questions should reference and build upon this existing content, exploring deeper stories, emotions, connections, or related experiences.` : ''}

ANTI-RABBIT-HOLE STRATEGY:
Before asking any question, evaluate whether the topic is sufficiently covered. A topic is considered "sufficiently covered" if the existing content includes: basic facts (who/what/when/where), emotional impact, and how it shaped the person. If a topic meets these criteria, MOVE TO NEW UNEXPLORED AREAS instead of drilling deeper.

Priority Order for Questions:
1. UNEXPLORED LIFE THEMES: Identify gaps in the life story and prioritize asking about completely uncovered areas from different life periods, relationships, or experiences
2. THEME PROGRESSION: If current chapter theme is well-covered, guide toward related but distinct experiences that advance the overall narrative
3. CONNECTING THREADS: Link existing stories to broader life patterns or values, but only if it reveals NEW insights
4. DEPTH ONLY WHEN WARRANTED: Only go deeper into existing topics if they're mentioned but lack emotional context or significance

Topic Saturation Check:
- If existing content covers WHO was involved, WHAT happened, WHEN/WHERE it occurred, and HOW it affected the person emotionally, consider that topic sufficiently documented
- Recognize when follow-up questions would be repetitive vs. genuinely progressive
- Pivot away from over-covered topics toward fresh life experiences that serve the autobiography's completeness

Systematic Life Coverage:
Act like a systematic biographer ensuring comprehensive life coverage rather than getting fixated on expanding already-documented stories. Balance depth with breadth across the user's life story, always progressing toward unexplored territories that fulfill the conversation goals.

Guidelines:
Act as a warm, patient friend, uncovering meaningful memories and stories one step at a time (one focused event, relationship, or lesson per message).
${isInitial
  ? hasExistingChapterContent 
    ? `This chapter has existing content. CRITICAL: Do NOT ask follow-up questions about already well-documented topics (those with clear facts + emotions + impact). Instead, identify COMPLETELY UNEXPLORED areas within the "${chapterInfo?.title}" theme and ask about those. Only expand existing content if it genuinely lacks emotional significance or personal meaning.`
    : `Start with a question that DIRECTLY addresses the "${chapterInfo?.title}" chapter theme. Use the broader context only to personalize the question, but the core topic MUST match the chapter title (e.g., if chapter is "Toddler Years," ask about early childhood memories, first words, favorite toys from that age—NOT about parents' army service or pre-birth events).`
  : 'Continue building on the user\'s responses with specific, story-deepening questions that explore impacts, emotions, or connections to life goals, BUT prioritize advancing to NEW unexplored areas if current topics are well-documented.'
}
${isInitial ? '' : 'After exchanges, allow slightly broader questions that build directly on the user\'s prior response, staying narrative-driven and tied to the conversation flow (e.g., after mentioning a homecoming, ask "What emotions did you feel during that moment, and how did it shape your relationship?"). If a response focuses on minor details, pivot immediately to their broader significance (e.g., "Building on that description, how did [detail] play a role in a key family event?"). CRITICALLY: If the conversation has thoroughly covered a topic (facts + emotions + impact), transition to completely new areas of their life story.'}
Check prior responses to avoid repeating or re-asking similar questions and to detect rabbit holes—redirect to conversation goals AND unexplored life areas if questions become too detail-oriented or repetitive.
Acknowledge prior responses briefly only to set up the next question; never summarize or elaborate.
Probe for sensory details, feelings, or related anecdotes only if they enrich a larger story or tie to personal growth; otherwise, focus on emotional or relational insights.
For potentially fuzzy memories, add a gentle nudge like "even if it's fuzzy" only if needed (e.g., "Even if it's fuzzy—...").
Keep responses to 1 sentence: minimal empathetic setup + one easy question. Always end with that question, staying non-judgmental and encouraging through phrasing, without digressing or wrapping up.
MOST IMPORTANT: All questions must relate to and support the "${chapterInfo?.title}" chapter theme - ensure every question connects to this specific chapter being worked on, guiding toward core memories and personal stories that align with the conversation goals while systematically covering different aspects of their life rather than endlessly expanding on already-documented areas.
${isInitial
  ? hasExistingChapterContent
    ? `AVOID asking about already documented topics. Instead, ask about DIFFERENT aspects of the "${chapterInfo?.title}" theme that are completely unexplored within this chapter's scope.`
    : `Start with a single, vivid question about the "${chapterInfo?.title}" period/theme. The question must be chapter-specific (e.g., "Toddler Years" → ask about ages 1-3 experiences, "Elementary School" → ask about ages 5-11, "Before My Birth" → ask about family stories from before birth). Use profile context to personalize but stay within the chapter's time period/theme.`
  : 'Continue asking concrete, specific questions that help them dive deeper into their experiences and memories, building naturally on what they\'ve shared while systematically progressing toward unexplored areas and conversation goals.'
}`;
  return basePrompt;
}


serve(handler);