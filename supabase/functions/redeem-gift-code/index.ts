import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedeemGiftCodeRequest {
  code: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT and get user info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code }: RedeemGiftCodeRequest = await req.json();

    // Validate code format (should be like XXXX-XXXX-XXXX)
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid gift code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    console.log('Attempting to redeem gift code:', normalizedCode, 'for user:', user.id);

    // Fetch the gift code with validation
    const { data: giftCode, error: fetchError } = await supabase
      .from('gift_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (fetchError || !giftCode) {
      console.error('Gift code not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid gift code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate gift code status
    if (giftCode.redeemed) {
      return new Response(
        JSON.stringify({ 
          error: 'Gift code already redeemed',
          redeemedAt: giftCode.redeemed_at 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(giftCode.expires_at);
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ 
          error: 'Gift code has expired',
          expiresAt: giftCode.expires_at 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check payment status
    if (giftCode.stripe_payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ 
          error: 'Gift code payment not confirmed',
          paymentStatus: giftCode.stripe_payment_status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gift code validated successfully. Tier:', giftCode.tier);

    // Check if user already has a book
    const { data: existingBooks, error: booksError } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (booksError) {
      console.error('Error fetching existing books:', booksError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing books' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let bookId: string;
    let bookAction: 'created' | 'upgraded';

    if (existingBooks && existingBooks.length > 0) {
      // Upgrade existing book
      const existingBook = existingBooks[0];
      bookId = existingBook.id;
      bookAction = 'upgraded';

      const { error: updateError } = await supabase
        .from('books')
        .update({
          tier: giftCode.tier,
          purchase_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);

      if (updateError) {
        console.error('Error upgrading book:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to upgrade book' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Book upgraded successfully:', bookId);
    } else {
      // Create new book
      const { data: newBook, error: createError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          tier: giftCode.tier,
          title: 'My Autobiography',
          status: 'active',
          purchase_status: 'completed',
        })
        .select()
        .single();

      if (createError || !newBook) {
        console.error('Error creating book:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create book' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      bookId = newBook.id;
      bookAction = 'created';

      console.log('Book created successfully:', bookId);
    }

    // Create order record for the redemption
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        book_id: bookId,
        status: 'completed',
        total_price: giftCode.amount_paid,
        is_gift_redemption: true,
        gift_code_id: giftCode.id,
      });

    if (orderError) {
      console.error('Error creating order record:', orderError);
      // Don't fail the redemption if order creation fails, just log it
    }

    // Mark gift code as redeemed
    const { error: redeemError } = await supabase
      .from('gift_codes')
      .update({
        redeemed: true,
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('code', normalizedCode);

    if (redeemError) {
      console.error('Error marking gift code as redeemed:', redeemError);
      return new Response(
        JSON.stringify({ error: 'Failed to mark gift code as redeemed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gift code redeemed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Gift code redeemed successfully! Your book has been ${bookAction}.`,
        bookId: bookId,
        tier: giftCode.tier,
        bookAction: bookAction,
        giftMessage: giftCode.gift_message,
        purchaserName: giftCode.purchaser_name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error redeeming gift code:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
