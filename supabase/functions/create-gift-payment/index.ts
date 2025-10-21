import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GiftPaymentRequest {
  tier: 'basic' | 'standard' | 'premium';
  recipient_email: string;
  purchaser_name: string;
  purchaser_email: string;
  gift_message?: string;
}

const tierPrices = {
  basic: 2999,
  standard: 4999,
  premium: 9999,
};

const tierNames = {
  basic: 'Basic Book Package',
  standard: 'Standard Book Package',
  premium: 'Premium Book Package',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tier, recipient_email, purchaser_name, purchaser_email, gift_message }: GiftPaymentRequest = await req.json();

    // Validate tier
    if (!tierPrices[tier]) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email) || !emailRegex.test(purchaser_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique gift code
    const generateGiftCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i < 11) code += '-';
      }
      return code;
    };

    let giftCode = generateGiftCode();
    
    // Ensure code is unique
    let codeExists = true;
    while (codeExists) {
      const { data } = await supabase
        .from('gift_codes')
        .select('code')
        .eq('code', giftCode)
        .single();
      
      if (!data) {
        codeExists = false;
      } else {
        giftCode = generateGiftCode();
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2023-10-16',
    });

    const price = tierPrices[tier];

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: purchaser_email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Gift: ${tierNames[tier]}`,
              description: `Gift for ${recipient_email}`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/gift-success?session_id={CHECKOUT_SESSION_ID}&recipient_email=${encodeURIComponent(recipient_email)}&purchaser_email=${encodeURIComponent(purchaser_email)}&tier=${tier}`,
      cancel_url: `${req.headers.get('origin')}/gift`,
      metadata: {
        type: 'gift_purchase',
        gift_code: giftCode,
        tier: tier,
        recipient_email: recipient_email,
      },
    });

    console.log('Stripe session created:', session.id);

    // Insert gift code record
    const { error: insertError } = await supabase
      .from('gift_codes')
      .insert({
        code: giftCode,
        tier: tier,
        recipient_email: recipient_email,
        purchaser_name: purchaser_name,
        purchaser_email: purchaser_email,
        gift_message: gift_message || null,
        amount_paid: price / 100,
        stripe_session_id: session.id,
        stripe_payment_status: 'pending',
      });

    if (insertError) {
      console.error('Error inserting gift code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create gift code record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gift code created:', giftCode);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        giftCode: giftCode,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating gift payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
