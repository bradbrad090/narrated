-- CRITICAL SECURITY FIX: Remove public access to analytics tables
-- These tables contain sensitive user behavior and PII data

-- Drop existing public read policies on analytics_sessions
DROP POLICY IF EXISTS "Analytics are publicly readable" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Analytics tracker can insert sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Analytics tracker can update sessions" ON public.analytics_sessions;

-- Drop existing public read policies on analytics_page_views
DROP POLICY IF EXISTS "Page views are publicly readable" ON public.analytics_page_views;
DROP POLICY IF EXISTS "Analytics tracker can insert page views" ON public.analytics_page_views;

-- Create secure policies for analytics_sessions
-- Only service role can read/write (via edge functions)
CREATE POLICY "Service role can manage analytics sessions"
ON public.analytics_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create secure policies for analytics_page_views
-- Only service role can read/write (via edge functions)
CREATE POLICY "Service role can manage analytics page views"
ON public.analytics_page_views
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment to document the security decision
COMMENT ON TABLE public.analytics_sessions IS 'Analytics data - access restricted to service role only to prevent competitor scraping';
COMMENT ON TABLE public.analytics_page_views IS 'Page view data - access restricted to service role only to prevent data mining';