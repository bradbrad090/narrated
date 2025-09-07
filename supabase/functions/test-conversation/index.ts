import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

const handler = async (request: Request): Promise<Response> => {
  console.log('=== TEST CONVERSATION FUNCTION ===');
  console.log('Method:', request.method);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    // Check if we can read the body
    const rawBody = await request.text();
    console.log('Raw body received:', rawBody);
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body type:', typeof rawBody);

    if (!rawBody || rawBody.trim() === '') {
      console.log('Body is empty or whitespace only');
      return new Response(JSON.stringify({ 
        error: "Empty request body",
        received: rawBody,
        length: rawBody.length
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      console.log('Successfully parsed body:', parsedBody);
    } catch (parseError) {
      console.log('Failed to parse JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON",
        details: parseError.message,
        received: rawBody
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return success with the received data
    return new Response(JSON.stringify({
      success: true,
      received: parsedBody,
      message: "Test function working correctly"
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in test function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);