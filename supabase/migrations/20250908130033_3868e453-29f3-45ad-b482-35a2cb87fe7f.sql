-- Create function to send messages to pgmq queue
CREATE OR REPLACE FUNCTION public.pgmq_send(queue_name TEXT, msg JSONB)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pgmq.send(queue_name, msg);
$$;