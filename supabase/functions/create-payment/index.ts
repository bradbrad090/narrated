import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  bookId: string;
  tier: 'free' | 'paid' | 'premium';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Stripe key - try multiple approaches
    let stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found, trying alternatives...");
      stripeKey = Deno.env.get("STRIPE_SECRET");
      if (!stripeKey) {
        stripeKey = Deno.env.get("stripe_secret_key");
      }
    }

    if (!stripeKey) {
      console.error("No Stripe key found in any format");
      return new Response(JSON.stringify({ 
        error: "Stripe not configured - contact support" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("Stripe key found, length:", stripeKey.length);

    // Get request data
    const { bookId, tier }: PaymentRequest = await req.json();

    if (!bookId || !tier) {
      throw new Error("Missing bookId or tier");
    }

    // Handle free tier
    if (tier === 'free') {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");
      
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseService.auth.getUser(token);
      if (!userData.user) throw new Error("Invalid user");

      await supabaseService
        .from("books")
        .update({ tier: 'free', purchase_status: 'active' })
        .eq("id", bookId)
        .eq("user_id", userData.user.id);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Free tier activated",
        tier: 'free'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    if (!userData.user?.email) throw new Error("Invalid user");

    // Verify book ownership
    const { data: bookData } = await supabaseClient
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!bookData) throw new Error("Book not found");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Pricing
    const pricing = {
      paid: { amount: 2999, name: "Standard Book - $29.99" },
      premium: { amount: 4999, name: "Premium Book - $49.99" },
    };

    const selectedPricing = pricing[tier as keyof typeof pricing];
    if (!selectedPricing) throw new Error("Invalid tier");

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: userData.user.email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { 
            name: selectedPricing.name,
            description: `${tier} tier for "${bookData.title}"`,
          },
          unit_amount: selectedPricing.amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?book_id=${bookId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/write/${bookId}`,
      metadata: { bookId, userId: userData.user.id, tier },
    });

    console.log("Stripe session created:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Payment failed" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});