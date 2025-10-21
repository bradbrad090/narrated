-- Create gift_codes table
CREATE TABLE public.gift_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'standard', 'premium')),
  
  -- Purchase details
  purchaser_email TEXT NOT NULL,
  purchaser_name TEXT,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_status TEXT CHECK (stripe_payment_status IN ('paid', 'pending', 'failed')),
  amount_paid DECIMAL(10,2),
  
  -- Recipient details
  recipient_email TEXT NOT NULL,
  gift_message TEXT,
  
  -- Redemption tracking
  redeemed BOOLEAN DEFAULT FALSE,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  order_id UUID,
  
  -- Metadata
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns to orders table for bidirectional linking
ALTER TABLE public.orders 
  ADD COLUMN gift_code_id UUID REFERENCES public.gift_codes(id) ON DELETE SET NULL,
  ADD COLUMN is_gift_redemption BOOLEAN DEFAULT FALSE;

-- Add foreign key from gift_codes to orders (completing bidirectional link)
ALTER TABLE public.gift_codes
  ADD CONSTRAINT fk_gift_codes_order_id 
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_gift_codes_code ON public.gift_codes(code);
CREATE INDEX idx_gift_codes_stripe_session ON public.gift_codes(stripe_session_id);
CREATE INDEX idx_gift_codes_recipient_email ON public.gift_codes(recipient_email);
CREATE INDEX idx_gift_codes_redeemed ON public.gift_codes(redeemed, expires_at);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_gift_codes_updated_at
  BEFORE UPDATE ON public.gift_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Purchasers can view their own gifts
CREATE POLICY "Purchasers can view own gifts"
  ON public.gift_codes FOR SELECT
  USING (purchaser_email = (auth.jwt()->>'email'));

-- RLS Policy: Recipients can view unredeemed gifts sent to them
CREATE POLICY "Recipients can view gifts"
  ON public.gift_codes FOR SELECT
  USING (recipient_email = (auth.jwt()->>'email') AND NOT redeemed);

-- RLS Policy: Authenticated users can redeem valid gifts
CREATE POLICY "Users can redeem gifts"
  ON public.gift_codes FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND NOT redeemed 
    AND expires_at > NOW()
    AND stripe_payment_status = 'paid'
  );

-- RLS Policy: Service role full access (for edge functions)
CREATE POLICY "Service role full access"
  ON public.gift_codes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');