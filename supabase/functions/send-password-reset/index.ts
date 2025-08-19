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
    
    // Debug all environment variables
    console.log('=== ENVIRONMENT DEBUG ===');
    const allEnvVars = Deno.env.toObject();
    console.log('All env vars:', Object.keys(allEnvVars));
    console.log('RESEND_API_KEY exists in env:', 'RESEND_API_KEY' in allEnvVars);
    console.log('========================');
    
    // Get the RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('API Key available:', !!resendApiKey);
    console.log('API Key length:', resendApiKey?.length || 0);
    
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

      // Send branded test email
      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [testEmail],
        subject: 'Test Email - Narrated',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Email - Narrated</title>
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(180deg, hsl(35, 25%, 98%), hsl(35, 20%, 96%)); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 8px 32px hsla(220, 25%, 15%, 0.08);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, hsl(220, 50%, 25%), hsl(220, 60%, 35%)); padding: 40px 30px; text-align: center;">
                <h1 style="color: hsl(35, 25%, 98%); margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Narrated</h1>
                <p style="color: hsl(42, 85%, 65%); margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Preserve Your Story</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: hsl(220, 25%, 15%); font-size: 24px; font-weight: 600; margin: 0 0 20px; line-height: 1.3;">Test Email Successful</h2>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  This is a test email from your Narrated system. If you're receiving this, your email configuration is working perfectly!
                </p>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0;">
                  Your autobiography platform is ready to send password reset emails and other important notifications.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: hsl(35, 15%, 92%); padding: 30px; text-align: center;">
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 0 0 10px;">
                  © 2024 Narrated. Preserving life stories with AI assistance.
                </p>
                <p style="color: hsl(220, 15%, 45%); font-size: 12px; margin: 0;">
                  This email was sent to test the system configuration.
                </p>
              </div>
            </div>
          </body>
          </html>
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

      // Send branded password reset email
      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [userEmail],
        subject: 'Reset Your Password - Narrated',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - Narrated</title>
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(180deg, hsl(35, 25%, 98%), hsl(35, 20%, 96%)); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 8px 32px hsla(220, 25%, 15%, 0.08);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, hsl(220, 50%, 25%), hsl(220, 60%, 35%)); padding: 40px 30px; text-align: center;">
                <h1 style="color: hsl(35, 25%, 98%); margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Narrated</h1>
                <p style="color: hsl(42, 85%, 65%); margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Preserve Your Story</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: hsl(220, 25%, 15%); font-size: 24px; font-weight: 600; margin: 0 0 20px; line-height: 1.3;">Reset Your Password</h2>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                  We received a request to reset your password for your Narrated account. Click the button below to securely reset your password.
                </p>
                
                ${resetToken ? `
                  <div style="background-color: hsl(35, 15%, 92%); padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <p style="color: hsl(220, 25%, 15%); font-size: 14px; margin: 0 0 10px; font-weight: 500;">Or use this reset code:</p>
                    <div style="background-color: white; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: hsl(220, 50%, 25%); letter-spacing: 2px;">
                      ${resetToken}
                    </div>
                  </div>
                ` : ''}
                
                ${redirectTo ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${redirectTo}" style="background: linear-gradient(135deg, hsl(220, 50%, 25%), hsl(220, 60%, 35%)); color: hsl(35, 25%, 98%); padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px hsla(220, 50%, 25%, 0.3); transition: all 0.3s ease;">
                      Reset My Password
                    </a>
                  </div>
                ` : ''}
                
                <div style="background-color: hsl(42, 85%, 95%); border-left: 4px solid hsl(42, 85%, 65%); padding: 15px 20px; margin: 30px 0; border-radius: 4px;">
                  <p style="color: hsl(220, 25%, 15%); font-size: 14px; margin: 0; font-weight: 500;">
                    🔒 For your security, this link will expire in 24 hours.
                  </p>
                </div>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                  If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: hsl(35, 15%, 92%); padding: 30px; text-align: center; border-top: 1px solid hsl(35, 20%, 88%);">
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 0 0 10px;">
                  © 2024 Narrated. Preserving life stories with AI assistance.
                </p>
                <p style="color: hsl(220, 15%, 45%); font-size: 12px; margin: 0;">
                  If you're having trouble with the button above, copy and paste the URL into your web browser.
                </p>
              </div>
            </div>
          </body>
          </html>
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