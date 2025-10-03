import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    console.log('Chapter email function called');
    
    // Get the RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
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

    // Parse request body
    const { 
      email_type,
      user_email, 
      user_name, 
      chapter_title, 
      chapter_number, 
      chapter_content,
      is_first_submission,
      contact_name,
      contact_email,
      contact_subject,
      contact_message
    } = await req.json();

    if (!email_type) {
      return new Response(
        JSON.stringify({ error: 'email_type is required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Handle contact form emails
    if (email_type === 'contact_form') {
      if (!contact_name || !contact_email || !contact_subject || !contact_message) {
        return new Response(
          JSON.stringify({ error: 'All contact form fields are required' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Sending contact form email from:', contact_email);

      // Send contact form email to Narrated
      const { data, error } = await resend.emails.send({
        from: 'Narrated Contact Form <noreply@narrated.com.au>',
        to: ['brad@narrated.com.au'],
        replyTo: contact_email,
        subject: `Contact Form: ${contact_subject}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Contact Form Submission - Narrated</title>
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(180deg, hsl(35, 25%, 98%), hsl(35, 20%, 96%)); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 8px 32px hsla(220, 25%, 15%, 0.08);">
              <div style="background: linear-gradient(135deg, hsl(220, 50%, 25%), hsl(220, 60%, 35%)); padding: 40px 30px; text-align: center;">
                <h1 style="color: hsl(35, 25%, 98%); margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Narrated</h1>
                <p style="color: hsl(42, 85%, 65%); margin: 8px 0 0; font-size: 16px; opacity: 0.9;">New Contact Form Submission</p>
              </div>
              
              <div style="padding: 40px 30px;">
                <h2 style="color: hsl(220, 25%, 15%); font-size: 24px; font-weight: 600; margin: 0 0 20px; line-height: 1.3;">
                  ${contact_subject}
                </h2>
                
                <div style="background-color: hsl(35, 15%, 96%); padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: hsl(220, 25%, 15%); font-size: 14px; margin: 0 0 8px;"><strong>From:</strong> ${contact_name}</p>
                  <p style="color: hsl(220, 25%, 15%); font-size: 14px; margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${contact_email}" style="color: hsl(220, 50%, 45%);">${contact_email}</a></p>
                  <p style="color: hsl(220, 25%, 15%); font-size: 14px; margin: 0;"><strong>Sent:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <div style="background-color: hsl(220, 15%, 98%); padding: 20px; border-left: 4px solid hsl(220, 50%, 45%); border-radius: 4px; margin: 20px 0;">
                  <p style="color: hsl(220, 15%, 35%); font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${contact_message}</p>
                </div>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 20px 0 0;">
                  Reply directly to this email to respond to ${contact_name}.
                </p>
              </div>
              
              <div style="background-color: hsl(35, 15%, 92%); padding: 30px; text-align: center;">
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 0 0 10px;">
                  © 2024 Narrated. Preserving life stories with AI assistance.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      if (error) {
        console.error('Resend error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send contact form email', details: error }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Contact form email sent successfully:', data);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Contact form email sent', data }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Handle chapter submission emails (existing functionality)
    if (!user_email) {
      return new Response(
        JSON.stringify({ error: 'user_email is required for chapter submissions' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Sending chapter submission email to:', user_email);

    // Send chapter submission confirmation email
    const { data, error } = await resend.emails.send({
      from: 'Narrated <noreply@narrated.com.au>',
      to: [user_email],
      subject: is_first_submission ? 
        'Congratulations! Your First Chapter is Complete' : 
        `Chapter ${chapter_number} Submitted Successfully`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chapter Submitted - Narrated</title>
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
              <h2 style="color: hsl(220, 25%, 15%); font-size: 24px; font-weight: 600; margin: 0 0 20px; line-height: 1.3;">
                ${is_first_submission ? '🎉 Your First Chapter is Complete!' : 'Chapter Submitted Successfully!'}
              </h2>
              
              <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi ${user_name || 'there'},
              </p>
              
              <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${is_first_submission ? 
                  'Congratulations on completing your first chapter! This is a significant milestone in your autobiography journey.' :
                  `Your chapter "${chapter_title}" has been successfully submitted and finalized.`
                }
              </p>
              
              <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${is_first_submission ?
                  'Your story is now taking shape, and each chapter you complete brings your autobiography closer to completion.' :
                  'You can continue working on your next chapters to build your complete life story.'
                }
              </p>
              
              <div style="background-color: hsl(35, 15%, 96%); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: hsl(220, 25%, 15%); font-size: 18px; font-weight: 600; margin: 0 0 10px; text-align: center;">
                  ${chapter_title} (Chapter ${chapter_number})
                </h3>
                <div style="color: hsl(220, 15%, 35%); font-size: 14px; line-height: 1.6; white-space: pre-wrap; max-height: 400px; overflow-y: auto; text-align: left;">
                  ${chapter_content || 'No content available'}
                </div>
              </div>
              
              <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0;">
                Keep up the great work on preserving your life story!
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: hsl(35, 15%, 92%); padding: 30px; text-align: center;">
              <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 0 0 10px;">
                © 2024 Narrated. Preserving life stories with AI assistance.
              </p>
              <p style="color: hsl(220, 15%, 45%); font-size: 12px; margin: 0;">
                This email was sent because you submitted a chapter in your Narrated autobiography.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
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

    console.log('Chapter submission email sent successfully:', data);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Chapter submission email sent', data }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-chapter-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});