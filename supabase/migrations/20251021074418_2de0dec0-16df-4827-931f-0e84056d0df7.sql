-- Fix anonymous access on gift_codes table by restricting policies to authenticated users only

-- Drop existing policies
DROP POLICY IF EXISTS "Purchasers can view own gifts" ON public.gift_codes;
DROP POLICY IF EXISTS "Recipients can view gifts" ON public.gift_codes;
DROP POLICY IF EXISTS "Users can redeem gifts" ON public.gift_codes;
DROP POLICY IF EXISTS "Service role full access" ON public.gift_codes;

-- Recreate policies with proper role restrictions

-- RLS Policy: Purchasers can view their own gifts (authenticated only)
CREATE POLICY "Purchasers can view own gifts"
  ON public.gift_codes FOR SELECT
  TO authenticated
  USING (purchaser_email = (auth.jwt()->>'email'));

-- RLS Policy: Recipients can view unredeemed gifts sent to them (authenticated only)
CREATE POLICY "Recipients can view gifts"
  ON public.gift_codes FOR SELECT
  TO authenticated
  USING (recipient_email = (auth.jwt()->>'email') AND NOT redeemed);

-- RLS Policy: Authenticated users can redeem valid gifts
CREATE POLICY "Users can redeem gifts"
  ON public.gift_codes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND NOT redeemed 
    AND expires_at > NOW()
    AND stripe_payment_status = 'paid'
  );

-- RLS Policy: Service role full access (for edge functions)
CREATE POLICY "Service role full access"
  ON public.gift_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);