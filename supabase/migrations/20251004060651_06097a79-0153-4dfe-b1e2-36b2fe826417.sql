-- Create analytics tables for visitor and user journey tracking

-- Table 1: Track visitor sessions with geographic data
CREATE TABLE public.analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  country text,
  referrer text,
  signed_up boolean DEFAULT false,
  created_book boolean DEFAULT false,
  started_profile boolean DEFAULT false,
  started_conversation boolean DEFAULT false
);

-- Table 2: Track page views
CREATE TABLE public.analytics_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  page_path text NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read for analytics (they're anonymous anyway)
-- But only the analytics-tracker function can write
CREATE POLICY "Analytics are publicly readable"
ON public.analytics_sessions
FOR SELECT
TO public
USING (true);

CREATE POLICY "Analytics tracker can insert sessions"
ON public.analytics_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Analytics tracker can update sessions"
ON public.analytics_sessions
FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Page views are publicly readable"
ON public.analytics_page_views
FOR SELECT
TO public
USING (true);

CREATE POLICY "Analytics tracker can insert page views"
ON public.analytics_page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_analytics_sessions_session_id ON public.analytics_sessions(session_id);
CREATE INDEX idx_analytics_sessions_user_id ON public.analytics_sessions(user_id);
CREATE INDEX idx_analytics_sessions_first_seen ON public.analytics_sessions(first_seen_at);
CREATE INDEX idx_analytics_page_views_session_id ON public.analytics_page_views(session_id);
CREATE INDEX idx_analytics_page_views_viewed_at ON public.analytics_page_views(viewed_at);

-- Auto-cleanup function: Delete records older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete old sessions
  DELETE FROM public.analytics_sessions 
  WHERE first_seen_at < now() - INTERVAL '30 days';
  
  -- Delete old page views
  DELETE FROM public.analytics_page_views 
  WHERE viewed_at < now() - INTERVAL '30 days';
END;
$$;

-- Schedule daily cleanup (requires pg_cron extension)
-- Note: This will need to be set up manually in Supabase dashboard
-- SELECT cron.schedule('cleanup-analytics', '0 2 * * *', 'SELECT public.cleanup_old_analytics()');
