-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.cleanup_expired_context_cache()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.conversation_context_cache 
  WHERE expires_at < now();
END;
$$;