import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const isValidTier = (tier: string): boolean => {
  return ['basic', 'standard', 'premium', 'free'].includes(tier);
};

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return new Response(
        JSON.stringify({ error: 'Missing signature or webhook secret' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook event received:', event.type, event.id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing checkout.session.completed:', session.id);

      // Validate session data
      if (!session.id || !session.payment_intent) {
        console.error('Invalid session data:', session.id);
        return new Response(
          JSON.stringify({ error: 'Invalid session data' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check metadata to determine payment type
      const metadata = session.metadata || {};
      const paymentType = metadata.type;

      console.log('Payment type:', paymentType);

      if (paymentType === 'gift_purchase') {
        // Handle gift purchase
        const giftCode = metadata.gift_code;
        const tier = metadata.tier;
        const recipientEmail = metadata.recipient_email;

        // Validate gift purchase metadata
        if (!giftCode || !tier || !recipientEmail) {
          console.error('Missing gift purchase metadata:', { giftCode, tier, recipientEmail });
          return new Response(
            JSON.stringify({ error: 'Invalid gift purchase metadata' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Validate tier and email
        if (!isValidTier(tier)) {
          console.error('Invalid tier:', tier);
          return new Response(
            JSON.stringify({ error: 'Invalid tier' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (!isValidEmail(recipientEmail)) {
          console.error('Invalid recipient email:', recipientEmail);
          return new Response(
            JSON.stringify({ error: 'Invalid recipient email' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Update gift_codes table with payment confirmation
        const { data: giftData, error: updateError } = await supabase
          .from('gift_codes')
          .update({
            stripe_payment_status: 'paid',
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id)
          .eq('code', giftCode)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating gift_codes:', updateError);
          return new Response(
            JSON.stringify({ error: 'Database update failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (!giftData) {
          console.error('Gift code not found:', giftCode);
          return new Response(
            JSON.stringify({ error: 'Gift code not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log('Gift code payment confirmed:', giftCode);

        // Send purchase confirmation email to purchaser
        try {
          const emailResponse = await supabase.functions.invoke('send-chapter-email', {
            body: {
              email_type: 'gift_purchase_confirmation',
              gift_code: giftData.code,
              tier: giftData.tier,
              recipient_email: giftData.recipient_email,
              purchaser_email: giftData.purchaser_email,
              purchaser_name: giftData.purchaser_name || 'Gift Purchaser',
              gift_message: giftData.gift_message,
              amount_paid: giftData.amount_paid,
            }
          });

          if (emailResponse.error) {
            console.error('Error sending purchase confirmation email:', emailResponse.error);
          } else {
            console.log('Purchase confirmation email sent to:', giftData.purchaser_email);
          }
        } catch (emailError) {
          console.error('Failed to send purchase confirmation email:', emailError);
        }

      } else if (paymentType === 'book_tier_purchase') {
        // Handle regular book tier purchase (existing flow)
        const bookId = metadata.book_id;
        const tier = metadata.tier;

        if (!bookId || !tier) {
          console.error('Missing book purchase metadata:', { bookId, tier });
          return new Response(
            JSON.stringify({ error: 'Invalid book purchase metadata' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (!isValidTier(tier)) {
          console.error('Invalid tier:', tier);
          return new Response(
            JSON.stringify({ error: 'Invalid tier' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Update books table
        const { error: bookUpdateError } = await supabase
          .from('books')
          .update({
            tier: tier,
            purchase_status: 'active',
            stripe_purchase_id: session.payment_intent as string,
          })
          .eq('id', bookId);

        if (bookUpdateError) {
          console.error('Error updating book:', bookUpdateError);
          return new Response(
            JSON.stringify({ error: 'Book update failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log('Book tier updated:', bookId, tier);
      } else {
        console.log('Unknown payment type, skipping processing:', paymentType);
      }
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log('Processing payment_intent.payment_failed:', paymentIntent.id);

      if (!paymentIntent.id) {
        console.error('Invalid payment intent data');
        return new Response(
          JSON.stringify({ error: 'Invalid payment intent data' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Update gift_codes table with failed status
      const { error: updateError } = await supabase
        .from('gift_codes')
        .update({
          stripe_payment_status: 'failed',
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (updateError) {
        console.error('Error updating gift_codes for failed payment:', updateError);
      } else {
        console.log('Gift code marked as failed:', paymentIntent.id);
      }
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook handler error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
