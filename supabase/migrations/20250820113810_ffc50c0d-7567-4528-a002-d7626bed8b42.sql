-- Enhance chat_histories table for conversation features
ALTER TABLE public.chat_histories 
ADD COLUMN conversation_type TEXT CHECK (conversation_type IN ('interview', 'reflection', 'brainstorming')) DEFAULT 'interview',
ADD COLUMN context_snapshot JSONB DEFAULT '{}',
ADD COLUMN conversation_goals JSONB DEFAULT '[]',
ADD COLUMN session_id TEXT,
ADD COLUMN chapter_id UUID REFERENCES public.chapters(id);

-- Create index for better performance
CREATE INDEX idx_chat_histories_session_id ON public.chat_histories(session_id);
CREATE INDEX idx_chat_histories_conversation_type ON public.chat_histories(conversation_type);

-- Create conversation_context_cache table for caching
CREATE TABLE public.conversation_context_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  chapter_id UUID,
  context_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour')
);

-- Enable RLS on conversation_context_cache
ALTER TABLE public.conversation_context_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_context_cache
CREATE POLICY "Users can manage their own context cache" 
ON public.conversation_context_cache 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_context_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.conversation_context_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update updated_at timestamp
CREATE TRIGGER update_conversation_context_cache_updated_at
BEFORE UPDATE ON public.conversation_context_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();