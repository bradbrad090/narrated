import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  sessionId: string;
  bookId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Payment verification started");

    const { sessionId, bookId }: VerificationRequest = await req.json();
    
    if (!sessionId || !bookId) {
      throw new Error("Missing sessionId or bookId");
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
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("Session retrieved:", session.id, "Status:", session.payment_status);

    // Create service client for database updates
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let purchaseStatus = 'failed';
    
    if (session.payment_status === 'paid') {
      purchaseStatus = 'active';
      console.log("Payment confirmed as successful");
    } else if (session.payment_status === 'unpaid') {
      purchaseStatus = 'pending';
    }

    // Get tier from Stripe session metadata
    const tier = session.metadata?.tier || 'free';
    
    // Update book status and tier
    const { error: bookUpdateError } = await supabaseService
      .from("books")
      .update({
        purchase_status: purchaseStatus,
        stripe_purchase_id: sessionId,
        tier: tier,
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (bookUpdateError) {
      console.error("Error updating book:", bookUpdateError);
      throw new Error("Failed to update book status");
    }

    // Update order status
    await supabaseService
      .from("orders")
      .update({
        status: purchaseStatus,
      })
      .eq("book_id", bookId)
      .eq("user_id", user.id);

    console.log("Database updated with payment status:", purchaseStatus);

    return new Response(JSON.stringify({
      success: true,
      paymentStatus: session.payment_status,
      purchaseStatus: purchaseStatus,
      bookId: bookId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});