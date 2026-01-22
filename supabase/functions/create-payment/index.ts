import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  bookId: string;
  tier: 'free' | 'basic' | 'standard' | 'premium';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify required configuration
    console.log("Verifying payment configuration...");

    // Get Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key configured:", !!stripeKey);

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found");
      throw new Error("Payment configuration error");
    }

    // Get request data
    const { bookId, tier }: PaymentRequest = await req.json();
    console.log("Payment request received:", { bookId, tier });

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

    // Get user using service role to bypass JWT verification
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    
    const token = authHeader.replace("Bearer ", "");
    console.log("Auth token received:", token.substring(0, 20) + "...");
    
    const { data: userData, error: authError } = await supabaseService.auth.getUser(token);
    console.log("Auth result:", { user: userData.user?.id, email: userData.user?.email, error: authError });
    
    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    if (!userData.user?.email) throw new Error("Invalid user");

    // Verify book ownership using service role client
    console.log("Looking for book:", { bookId, userId: userData.user.id });
    const { data: bookData, error: bookError } = await supabaseService
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    console.log("Book query result:", { bookData, bookError });
    if (bookError) {
      console.error("Book query error:", bookError);
      throw new Error(`Database error: ${bookError.message}`);
    }
    if (!bookData) throw new Error("Book not found or access denied");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Pricing (in cents)
    const pricing = {
      basic: { amount: 900, name: "Basic Tier - $9" },
      standard: { amount: 1900, name: "Standard Tier - $19" },
      premium: { amount: 3900, name: "Premium Tier - $39" },
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
    // Return generic error to client, keep details in server logs
    return new Response(JSON.stringify({ 
      error: "Unable to process payment request" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});