import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Password reset function called');
    
    // Get the RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('API Key available:', !!resendApiKey);
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is missing');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Handle GET request for testing
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const testEmail = url.searchParams.get('test_email');
      
      if (!testEmail) {
        return new Response(
          JSON.stringify({ error: 'test_email parameter required for testing' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Sending test email to:', testEmail);

      // Send simple test email
      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [testEmail],
        subject: 'Password Reset Test - Narrated',
        html: `
          <h2>Password Reset Test</h2>
          <p>This is a test email from your Narrated password reset system.</p>
          <p>If you received this, your email configuration is working correctly!</p>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: error }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Test email sent successfully:', data);
      return new Response(
        JSON.stringify({ success: true, message: 'Test email sent', data }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Handle POST request (actual password reset)
    if (req.method === 'POST') {
      const payload = await req.json();
      console.log('Received payload:', JSON.stringify(payload, null, 2));

      // Extract user email and reset data
      const userEmail = payload.user?.email;
      const resetToken = payload.email_data?.token;
      const redirectTo = payload.email_data?.redirect_to;

      if (!userEmail) {
        return new Response(
          JSON.stringify({ error: 'User email not found in payload' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Sending password reset email to:', userEmail);

      // Send password reset email
      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [userEmail],
        subject: 'Reset Your Password - Narrated',
        html: `
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password for your Narrated account.</p>
          ${resetToken ? `<p><strong>Reset Code:</strong> ${resetToken}</p>` : ''}
          ${redirectTo ? `<p><a href="${redirectTo}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>` : ''}
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send password reset email', details: error }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Password reset email sent successfully:', data);
      return new Response(
        JSON.stringify({ success: true, message: 'Password reset email sent' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});