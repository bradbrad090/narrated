-- First, let's check if pgmq extension is properly enabled
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the pdf_jobs queue (this should work now)
SELECT pgmq.create('pdf_jobs');

-- Let's also create a helper function to check queue contents
CREATE OR REPLACE FUNCTION public.get_pdf_jobs()
RETURNS TABLE(msg_id bigint, read_ct int, enqueued_at timestamp with time zone, vt timestamp with time zone, message jsonb)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT msg_id, read_ct, enqueued_at, vt, message FROM pgmq.q_pdf_jobs;
$$;