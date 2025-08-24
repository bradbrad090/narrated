-- Create table for tracking conversation questions to prevent duplicates
CREATE TABLE public.conversation_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  chapter_id uuid NULL,
  conversation_session_id text NULL,
  conversation_type text NOT NULL CHECK (conversation_type IN ('interview', 'reflection', 'brainstorming')),
  question_text text NOT NULL,
  question_hash text NOT NULL, -- For quick duplicate detection
  semantic_keywords text[] NULL, -- For semantic similarity matching
  response_quality integer NULL CHECK (response_quality >= 1 AND response_quality <= 5),
  asked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own conversation questions" 
ON public.conversation_questions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation questions" 
ON public.conversation_questions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation questions" 
ON public.conversation_questions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation questions" 
ON public.conversation_questions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_conversation_questions_user_book ON public.conversation_questions(user_id, book_id);
CREATE INDEX idx_conversation_questions_type ON public.conversation_questions(conversation_type);
CREATE INDEX idx_conversation_questions_hash ON public.conversation_questions(question_hash);
CREATE INDEX idx_conversation_questions_asked_at ON public.conversation_questions(asked_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_conversation_questions_updated_at
BEFORE UPDATE ON public.conversation_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate question hash for duplicate detection
CREATE OR REPLACE FUNCTION public.generate_question_hash(question_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Normalize the text: lowercase, remove punctuation, trim whitespace
  RETURN md5(
    regexp_replace(
      lower(trim(question_text)), 
      '[^a-z0-9\s]', 
      '', 
      'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract keywords from question text for semantic matching
CREATE OR REPLACE FUNCTION public.extract_question_keywords(question_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  -- Common stop words to exclude
  stop_words TEXT[] := ARRAY['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'when', 'where', 'who', 'why', 'how', 'tell', 'me', 'about', 'your', 'you', 'i', 'we', 'they', 'it'];
  words TEXT[];
  keyword TEXT;
  keywords TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Convert to lowercase and split into words
  words := string_to_array(lower(regexp_replace(question_text, '[^a-zA-Z\s]', '', 'g')), ' ');
  
  -- Filter out stop words and short words
  FOREACH keyword IN ARRAY words LOOP
    IF length(keyword) >= 3 AND NOT (keyword = ANY(stop_words)) THEN
      keywords := array_append(keywords, keyword);
    END IF;
  END LOOP;
  
  RETURN keywords;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract questions from AI response text
CREATE OR REPLACE FUNCTION public.extract_questions_from_text(response_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  questions TEXT[] := ARRAY[]::TEXT[];
  sentences TEXT[];
  sentence TEXT;
  question_patterns TEXT[] := ARRAY[
    '.*\?$',  -- Ends with question mark
    '^(what|when|where|who|why|how|can|could|would|do|does|did|is|are|was|were|will|have|has|had).*',  -- Starts with question words
    '.*(tell me|share|describe|explain|talk about).*'  -- Contains question phrases
  ];
  pattern TEXT;
BEGIN
  -- Split text into sentences (basic split on . ! ?)
  sentences := string_to_array(
    regexp_replace(response_text, '([.!?])\s+', E'\\1|SPLIT|', 'g'), 
    '|SPLIT|'
  );
  
  -- Check each sentence against question patterns
  FOREACH sentence IN ARRAY sentences LOOP
    sentence := trim(sentence);
    
    -- Skip empty sentences
    IF length(sentence) = 0 THEN
      CONTINUE;
    END IF;
    
    -- Check against each pattern
    FOREACH pattern IN ARRAY question_patterns LOOP
      IF sentence ~* pattern THEN
        questions := array_append(questions, sentence);
        EXIT; -- Don't check other patterns for this sentence
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN questions;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a question is similar to previously asked questions
CREATE OR REPLACE FUNCTION public.is_question_duplicate(
  p_user_id UUID,
  p_book_id UUID,
  p_conversation_type TEXT,
  p_question_text TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  question_hash TEXT;
  keyword_overlap_threshold INTEGER := 3; -- Minimum number of overlapping keywords to consider duplicate
  new_keywords TEXT[];
  existing_keywords TEXT[];
  overlap_count INTEGER;
  existing_question RECORD;
BEGIN
  -- Generate hash for exact duplicate check
  question_hash := public.generate_question_hash(p_question_text);
  
  -- Check for exact hash match
  IF EXISTS (
    SELECT 1 FROM public.conversation_questions 
    WHERE user_id = p_user_id 
    AND book_id = p_book_id 
    AND conversation_type = p_conversation_type
    AND question_hash = question_hash
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Extract keywords from new question
  new_keywords := public.extract_question_keywords(p_question_text);
  
  -- Check for semantic similarity with recent questions (last 50)
  FOR existing_question IN 
    SELECT semantic_keywords 
    FROM public.conversation_questions 
    WHERE user_id = p_user_id 
    AND book_id = p_book_id 
    AND conversation_type = p_conversation_type
    AND semantic_keywords IS NOT NULL
    ORDER BY asked_at DESC 
    LIMIT 50
  LOOP
    existing_keywords := existing_question.semantic_keywords;
    
    -- Count overlapping keywords
    SELECT count(*) INTO overlap_count
    FROM unnest(new_keywords) AS new_kw
    WHERE new_kw = ANY(existing_keywords);
    
    -- If significant overlap, consider it a duplicate
    IF overlap_count >= keyword_overlap_threshold THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;