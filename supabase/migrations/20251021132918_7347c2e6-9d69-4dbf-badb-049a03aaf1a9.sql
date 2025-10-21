-- Add test code support to gift_codes table
ALTER TABLE public.gift_codes 
ADD COLUMN IF NOT EXISTS is_test_code boolean DEFAULT false;

-- Create index for faster test code lookups
CREATE INDEX IF NOT EXISTS idx_gift_codes_is_test_code ON public.gift_codes(is_test_code);

-- Insert pre-seeded test codes for all tiers
INSERT INTO public.gift_codes (
  code,
  tier,
  purchaser_email,
  purchaser_name,
  recipient_email,
  gift_message,
  amount_paid,
  stripe_payment_status,
  is_test_code,
  redeemed,
  expires_at
) VALUES
  (
    'TEST-BSIC-0001',
    'basic',
    'system@narrated.com.au',
    'Test System',
    'test@example.com',
    'Test code for Basic tier - can be reused for testing',
    0,
    'paid',
    true,
    false,
    now() + INTERVAL '10 years'
  ),
  (
    'TEST-STND-0001',
    'standard',
    'system@narrated.com.au',
    'Test System',
    'test@example.com',
    'Test code for Standard tier - can be reused for testing',
    0,
    'paid',
    true,
    false,
    now() + INTERVAL '10 years'
  ),
  (
    'TEST-PREM-0001',
    'premium',
    'system@narrated.com.au',
    'Test System',
    'test@example.com',
    'Test code for Premium tier - can be reused for testing',
    0,
    'paid',
    true,
    false,
    now() + INTERVAL '10 years'
  )
ON CONFLICT (code) DO NOTHING;