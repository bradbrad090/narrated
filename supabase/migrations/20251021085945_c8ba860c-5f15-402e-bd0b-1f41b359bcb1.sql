-- Add stripe_payment_intent_id column to gift_codes table
ALTER TABLE public.gift_codes 
ADD COLUMN stripe_payment_intent_id text;