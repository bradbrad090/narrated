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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Payment function started");

    // Check if Stripe key is configured
    console.log("=== ENVIRONMENT DEBUG ===");
    const allEnvVars = Deno.env.toObject();
    console.log("All environment variables:", Object.keys(allEnvVars));
    console.log("Looking for STRIPE_SECRET_KEY...");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("STRIPE_SECRET_KEY exists:", !!stripeKey);
    console.log("STRIPE_SECRET_KEY type:", typeof stripeKey);
    console.log("STRIPE_SECRET_KEY length:", stripeKey?.length || 0);
    
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      console.error("Available env vars that contain 'STRIPE':", 
        Object.keys(allEnvVars).filter(key => key.includes('STRIPE')));
      throw new Error("Payment system not configured - missing Stripe key");
    }
    
    // Validate key format
    if (!stripeKey.startsWith('sk_')) {
      console.error("Invalid Stripe key format - should start with sk_");
      console.error("Key starts with:", stripeKey.substring(0, 10));
      throw new Error("Invalid Stripe Secret Key format");
    }
    
    console.log("Stripe key found:", stripeKey.substring(0, 7) + "...");
    console.log("Stripe key type:", stripeKey.includes('test') ? 'test' : 'live');

    // Get request body
    const { bookId, tier }: PaymentRequest = await req.json();
    console.log("Payment request:", { bookId, tier });

    if (!bookId || !tier) {
      throw new Error("Missing required fields: bookId or tier");
    }

    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Auth token received (first 20 chars):", token.substring(0, 20) + "...");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      console.error("User authentication error:", userError);
      throw userError;
    }
    
    const user = userData.user;
    if (!user?.email) {
      console.error("User data:", userData);
      throw new Error("User not authenticated or email not available");
    }
    console.log("User authenticated:", user.email, "User ID:", user.id);

    // Verify user owns the book
    console.log("Querying book with ID:", bookId, "for user:", user.id);
    
    const { data: bookData, error: bookError } = await supabaseClient
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookError) {
      console.error("Book query error:", bookError);
      throw new Error(`Failed to fetch book: ${bookError.message}`);
    }

    if (!bookData) {
      console.error("Book not found for user:", user.id, "bookId:", bookId);
      throw new Error("Book not found or access denied");
    }

    console.log("Book verified:", bookData.title);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Define pricing tiers (dummy values for now)
    const pricing = {
      free: { amount: 0, name: "Free Tier" },
      paid: { amount: 2999, name: "Standard Book - $29.99" }, // $29.99
      premium: { amount: 4999, name: "Premium Book - $49.99" }, // $49.99
    };

    const selectedPricing = pricing[tier];
    if (!selectedPricing) {
      throw new Error("Invalid tier selected");
    }

    // Free tier doesn't need payment
    if (tier === 'free') {
      // Update book directly
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { error: updateError } = await supabaseService
        .from("books")
        .update({
          tier: 'free',
          purchase_status: 'active',
        })
        .eq("id", bookId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Free tier update error:", updateError);
        throw new Error(`Failed to activate free tier: ${updateError.message}`);
      }

      console.log("Free tier activated successfully");

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Free tier activated",
        tier: 'free'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if customer exists in Stripe
    console.log("Initializing Stripe with key:", stripeKey.substring(0, 7) + "...");
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Existing customer found:", customerId);
    } else {
      console.log("No existing customer found for:", user.email);
    }

    // Create Stripe checkout session
    console.log("Creating Stripe checkout session...");
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { 
                name: selectedPricing.name,
                description: `${tier} tier for "${bookData.title}\"`,
              },
              unit_amount: selectedPricing.amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/payment-success?book_id=${bookId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/write/${bookId}`,
        metadata: {
          bookId: bookId,
          userId: user.id,
          tier: tier,
        },
      });

      console.log("Stripe session created successfully:", session.id);
      
      // Update book with pending payment status
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const { error: bookUpdateError } = await supabaseService
        .from("books")
        .update({
          stripe_purchase_id: session.id,
          purchase_status: 'pending',
          tier: tier,
        })
        .eq("id", bookId)
        .eq("user_id", user.id);

      if (bookUpdateError) {
        console.error("Book update error:", bookUpdateError);
        // Don't fail the payment flow, just log the error
      }

      // Create order record
      const { error: orderError } = await supabaseService
        .from("orders")
        .insert({
          user_id: user.id,
          book_id: bookId,
          status: 'pending',
          total_price: selectedPricing.amount / 100, // Convert cents to dollars
          quantity: 1,
          created_at: new Date().toISOString(),
        });

      if (orderError) {
        console.error("Order creation error:", orderError);
        // Don't fail the payment flow, just log the error
      }

      console.log("Database updated with pending payment");

      return new Response(JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);
      throw new Error(`Stripe checkout failed: ${stripeError instanceof Error ? stripeError.message : "Unknown Stripe error"}`);
    }

  } catch (error) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});