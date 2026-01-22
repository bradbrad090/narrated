-- Fix gift_codes RLS policies for better security

-- 1. Remove the redundant "Service role full access" policy
-- Service role bypasses RLS anyway, so this policy is unnecessary and creates a security risk
DROP POLICY IF EXISTS "Service role full access" ON public.gift_codes;

-- 2. Fix the UPDATE policy to require authentication
-- The current policy only checks redeemed status, not user authentication
DROP POLICY IF EXISTS "Users can redeem gifts" ON public.gift_codes;

-- Create a secure UPDATE policy that requires authentication
-- Users can only update gift codes that are not yet redeemed
CREATE POLICY "Authenticated users can redeem gifts"
ON public.gift_codes
FOR UPDATE
TO authenticated
USING ((redeemed = false) AND (redeemed_by IS NULL))
WITH CHECK ((redeemed = true) AND (redeemed_by = auth.uid()));