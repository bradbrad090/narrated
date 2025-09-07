import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getAuthContext } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface PaymentRequest {
  bookId: string;
  tier: 'free' | 'paid' | 'premium';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId, tier }: PaymentRequest = await req.json();

    if (!bookId || !tier) {
      throw new Error("Missing bookId or tier");
    }

    // Get authenticated user and supabase client
    const { user, supabase } = await getAuthContext(req);
    const userId = user.id;

    // Handle free tier
    if (tier === 'free') {
      await supabase
        .from("books")
        .update({ tier: 'free', purchase_status: 'active' })
        .eq("id", bookId)
        .eq("user_id", userId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Free tier activated",
        tier: 'free'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Verify book ownership (RLS will handle this automatically)
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, user_id')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      throw new Error('Book not found or access denied');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Define pricing
    const pricing = {
      paid: { amount: 2999, name: "Paid Edition" },
      premium: { amount: 4999, name: "Premium Edition" }
    };

    const selectedTier = pricing[tier as keyof typeof pricing];
    if (!selectedTier) {
      throw new Error("Invalid tier");
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: selectedTier.name,
              description: `Your autobiography - ${selectedTier.name}`,
            },
            unit_amount: selectedTier.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/write-book`,
      metadata: {
        bookId,
        userId,
        tier,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment creation error:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message || "Payment creation failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});