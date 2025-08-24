import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { userId, bookId, chapterId, conversationType, existingContext } = await req.json();

    if (!userId || !bookId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user's conversation history and profile
    const { data: conversations } = await supabase
      .from('chat_histories')
      .select('conversation_data')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('chapter_id', chapterId || null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get previously asked questions to avoid duplication
    const { data: previousQuestions } = await supabase
      .from('conversation_questions')
      .select('question_text')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('chapter_id', chapterId || null)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationHistory = conversations?.map(c => c.conversation_data).flat() || [];
    const askedQuestions = previousQuestions?.map(q => q.question_text) || [];

    // Build context for question generation
    const contextPrompt = buildQuestionGenerationPrompt(
      conversationType || 'interview',
      conversationHistory,
      askedQuestions,
      existingContext
    );

    console.log('Generating questions with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert autobiography interviewer who generates thoughtful, personal questions to help people tell their life stories. Always respond with valid JSON containing an array of questions.'
          },
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let questions;
    try {
      const parsed = JSON.parse(content);
      questions = parsed.questions || parsed;
    } catch (e) {
      // Fallback: extract questions from text
      questions = extractQuestionsFromText(content);
    }

    console.log(`Generated ${questions.length} questions`);

    return new Response(JSON.stringify({ 
      questions: questions.slice(0, 5), // Return max 5 questions
      conversationType: conversationType || 'interview'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function buildQuestionGenerationPrompt(
  conversationType: string,
  conversationHistory: any[],
  askedQuestions: string[],
  existingContext?: string
): string {
  const typeInstructions = {
    interview: 'Generate follow-up interview questions that dig deeper into their experiences and emotions.',
    reflection: 'Create introspective questions that help them reflect on lessons learned and personal growth.',
    brainstorming: 'Suggest questions that help them explore new angles or forgotten memories about their story.'
  };

  const instruction = typeInstructions[conversationType as keyof typeof typeInstructions] || typeInstructions.interview;

  let prompt = `${instruction}

Context about the person's story:
${existingContext || 'No additional context provided.'}

Recent conversation topics:
${conversationHistory.slice(-10).map(msg => `- ${msg.role}: ${msg.content?.substring(0, 100)}...`).join('\n')}

Previously asked questions to AVOID repeating:
${askedQuestions.slice(0, 10).map(q => `- ${q}`).join('\n')}

Generate 5 thoughtful, personal questions that:
1. Build on what they've already shared
2. Are specific and engaging (not generic)
3. Help uncover meaningful details and emotions
4. Are different from previously asked questions
5. Feel natural and conversational

Respond with valid JSON in this format:
{
  "questions": [
    "Your first thoughtful question here?",
    "Your second question here?",
    "Your third question here?",
    "Your fourth question here?",
    "Your fifth question here?"
  ]
}`;

  return prompt;
}

function extractQuestionsFromText(text: string): string[] {
  const questionRegex = /(?:^|\n)\s*(?:\d+\.?\s*)?([^.!?\n]+\?)/gm;
  const matches = [];
  let match;
  
  while ((match = questionRegex.exec(text)) !== null) {
    const question = match[1].trim();
    if (question.length > 10 && question.length < 200) {
      matches.push(question + '?');
    }
  }
  
  return matches.slice(0, 5);
}