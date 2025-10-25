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
      contact_message,
      // Gift-related fields
      gift_code,
      tier,
      recipient_email,
      recipient_name,
      purchaser_name,
      purchaser_email,
      gift_message,
      redemption_url
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
        to: ['contact@narrated.com.au'],
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

    // Handle gift notification email (to recipient)
    if (email_type === 'gift_notification') {
      if (!recipient_email || !gift_code || !tier || !purchaser_name) {
        return new Response(
          JSON.stringify({ error: 'recipient_email, gift_code, tier, and purchaser_name are required for gift notifications' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Sending gift notification email to:', recipient_email);

      const tierDetails = {
        'basic': { 
          name: 'Basic Package',
          price: '$9',
          features: [
            'Unlimited chapters and word count',
            'Professional editing',
            '20 recipes',
            '100 photos',
            'Digital delivery (PDF)'
          ]
        },
        'standard': { 
          name: 'Standard Package',
          price: '$19',
          features: [
            'Unlimited chapters and word count',
            'Professional editing',
            '20 recipes',
            '100 photos',
            'Printed book + Digital PDF'
          ]
        },
        'premium': { 
          name: 'Premium Package',
          price: '$39',
          features: [
            'Unlimited chapters and word count',
            'Professional editing',
            'Unlimited recipes',
            'Unlimited photos',
            'Premium book + Digital PDF',
            '5 copies'
          ]
        }
      };
      
      const tierInfo = tierDetails[tier as keyof typeof tierDetails] || tierDetails['basic'];

      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [recipient_email],
        subject: `🎁 You've Received a Gift from ${purchaser_name}!`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gift Received - Narrated</title>
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(180deg, hsl(35, 25%, 98%), hsl(35, 20%, 96%)); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 8px 32px hsla(220, 25%, 15%, 0.08);">
              <div style="background: linear-gradient(135deg, hsl(220, 50%, 25%), hsl(220, 60%, 35%)); padding: 40px 30px; text-align: center;">
                <h1 style="color: hsl(35, 25%, 98%); margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Narrated</h1>
                <p style="color: hsl(42, 85%, 65%); margin: 8px 0 0; font-size: 16px; opacity: 0.9;">You've Received a Gift!</p>
              </div>
              
              <div style="padding: 40px 30px;">
                <h2 style="color: hsl(220, 25%, 15%); font-size: 24px; font-weight: 600; margin: 0 0 20px; line-height: 1.3;">
                  🎁 ${purchaser_name} has given you the gift of storytelling
                </h2>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Hi ${recipient_name || 'there'},
                </p>
                
                ${gift_message ? `
                <div style="background-color: hsl(220, 15%, 98%); padding: 20px; border-left: 4px solid hsl(42, 85%, 65%); border-radius: 4px; margin: 0 0 20px;">
                  <p style="color: hsl(220, 15%, 35%); font-size: 14px; font-style: italic; margin: 0; line-height: 1.6;">
                    "${gift_message}"
                  </p>
                  <p style="color: hsl(220, 15%, 45%); font-size: 12px; margin: 10px 0 0; text-align: right;">
                    — ${purchaser_name}
                  </p>
                </div>
                ` : ''}
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  You've been gifted a <strong>${tierInfo.name}</strong> autobiography package (${tierInfo.price} value). This is your opportunity to preserve your life story with the help of AI-powered conversation and professional editing.
                </p>
                
                <div style="background-color: hsl(35, 15%, 96%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: hsl(220, 25%, 15%); font-size: 18px; font-weight: 600; margin: 0 0 16px; text-align: center;">
                    Your ${tierInfo.name} Includes:
                  </h3>
                  <ul style="color: hsl(220, 15%, 35%); font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    ${tierInfo.features.map(feature => `<li>${feature}</li>`).join('\n                    ')}
                  </ul>
                  
                  <div style="background-color: hsl(220, 50%, 25%); padding: 16px; border-radius: 6px; margin: 20px 0 0; text-align: center;">
                    <p style="color: hsl(35, 25%, 98%); font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your Gift Code</p>
                    <p style="color: hsl(42, 85%, 65%); font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 2px; font-family: monospace;">
                      ${gift_code}
                    </p>
                  </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${redemption_url || 'https://narrated.com.au'}" style="display: inline-block; background: linear-gradient(135deg, hsl(220, 50%, 45%), hsl(220, 60%, 55%)); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px hsla(220, 50%, 45%, 0.3);">
                    Redeem Your Gift & Start Your Story
                  </a>
                </div>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                  Questions? Reply to this email or visit our website for support.
                </p>
              </div>
              
              <div style="background-color: hsl(35, 15%, 92%); padding: 30px; text-align: center;">
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 0 0 10px;">
                  © 2024 Narrated. Preserving life stories with AI assistance.
                </p>
                <p style="color: hsl(220, 15%, 45%); font-size: 12px; margin: 0;">
                  This gift was purchased by ${purchaser_name}
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
          JSON.stringify({ error: 'Failed to send gift notification email', details: error }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Gift notification email sent successfully:', data);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Gift notification email sent', data }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Handle gift purchase confirmation email (to purchaser)
    if (email_type === 'gift_purchase_confirmation') {
      if (!purchaser_email || !gift_code || !tier || !recipient_email) {
        return new Response(
          JSON.stringify({ error: 'purchaser_email, gift_code, tier, and recipient_email are required for purchase confirmations' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Sending gift purchase confirmation email to:', purchaser_email);

      const tierDetails = {
        'basic': { name: 'Basic', price: '$9' },
        'standard': { name: 'Standard', price: '$19' },
        'premium': { name: 'Premium', price: '$39' }
      };
      
      const tierInfo = tierDetails[tier as keyof typeof tierDetails] || tierDetails['basic'];

      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [purchaser_email],
        subject: `Order Confirmation - Narrated Gift Package`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gift Purchase Confirmed - Narrated</title>
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(180deg, hsl(35, 25%, 98%), hsl(35, 20%, 96%)); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 8px 32px hsla(220, 25%, 15%, 0.08);">
              <div style="background: linear-gradient(135deg, hsl(220, 50%, 25%), hsl(220, 60%, 35%)); padding: 40px 30px; text-align: center;">
                <h1 style="color: hsl(35, 25%, 98%); margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Narrated</h1>
                <p style="color: hsl(42, 85%, 65%); margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Gift Purchase Confirmed</p>
              </div>
              
              <div style="padding: 40px 30px;">
                <h2 style="color: hsl(220, 25%, 15%); font-size: 24px; font-weight: 600; margin: 0 0 20px; line-height: 1.3;">
                  Order Confirmation
                </h2>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Thank you for your purchase!
                </p>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Your gift purchase has been successfully processed. You've given someone special the opportunity to preserve their life story with Narrated.
                </p>
                
                <div style="background-color: hsl(35, 15%, 96%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: hsl(220, 25%, 15%); font-size: 18px; font-weight: 600; margin: 0 0 16px;">Order Summary</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: hsl(220, 15%, 35%); font-size: 14px; padding: 8px 0; border-bottom: 1px solid hsl(220, 15%, 90%);">Order Date:</td>
                      <td style="color: hsl(220, 25%, 15%); font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid hsl(220, 15%, 90%); text-align: right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    <tr>
                      <td style="color: hsl(220, 15%, 35%); font-size: 14px; padding: 8px 0; border-bottom: 1px solid hsl(220, 15%, 90%);">Package:</td>
                      <td style="color: hsl(220, 25%, 15%); font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid hsl(220, 15%, 90%); text-align: right;">${tierInfo.name} Package</td>
                    </tr>
                    <tr>
                      <td style="color: hsl(220, 15%, 35%); font-size: 14px; padding: 8px 0; border-bottom: 1px solid hsl(220, 15%, 90%);">Amount Paid:</td>
                      <td style="color: hsl(220, 25%, 15%); font-size: 14px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid hsl(220, 15%, 90%); text-align: right;">${amount_paid ? '$' + amount_paid : tierInfo.price}</td>
                    </tr>
                    <tr>
                      <td style="color: hsl(220, 15%, 35%); font-size: 14px; padding: 8px 0;">Recipient Email:</td>
                      <td style="color: hsl(220, 25%, 15%); font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">${recipient_email}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background-color: hsl(220, 15%, 98%); padding: 20px; border-left: 4px solid hsl(220, 50%, 45%); border-radius: 4px; margin: 20px 0;">
                  <h4 style="color: hsl(220, 25%, 15%); font-size: 16px; font-weight: 600; margin: 0 0 10px;">What happens next?</h4>
                  <p style="color: hsl(220, 15%, 35%); font-size: 14px; line-height: 1.6; margin: 0;">
                    We've sent an email to <strong>${recipient_email}</strong> with their gift code and instructions to redeem their package. They'll be able to start their autobiography journey right away.
                  </p>
                </div>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 20px 0 0;">
                  Thank you for helping preserve precious memories with Narrated!
                </p>
              </div>
              
              <div style="background-color: hsl(35, 15%, 92%); padding: 30px; text-align: center;">
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 0 0 10px;">
                  © 2024 Narrated. Preserving life stories with AI assistance.
                </p>
                <p style="color: hsl(220, 15%, 45%); font-size: 12px; margin: 0;">
                  Questions? Contact us at hello@narrated.com.au
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
          JSON.stringify({ error: 'Failed to send gift purchase confirmation email', details: error }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Gift purchase confirmation email sent successfully:', data);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Gift purchase confirmation email sent', data }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Handle gift redemption confirmation email
    if (email_type === 'gift_redemption_confirmation') {
      if (!user_email || !tier) {
        return new Response(
          JSON.stringify({ error: 'user_email and tier are required for redemption confirmations' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Sending gift redemption confirmation email to:', user_email);

      const tierDetails = {
        'basic': { 
          name: 'Basic Package',
          features: [
            'Unlimited chapters and word count',
            'Professional editing',
            '20 recipes',
            '100 photos',
            'Digital delivery (PDF)'
          ]
        },
        'standard': { 
          name: 'Standard Package',
          features: [
            'Unlimited chapters and word count',
            'Professional editing',
            '20 recipes',
            '100 photos',
            'Printed book + Digital PDF'
          ]
        },
        'premium': { 
          name: 'Premium Package',
          features: [
            'Unlimited chapters and word count',
            'Professional editing',
            'Unlimited recipes',
            'Unlimited photos',
            'Premium book + Digital PDF',
            '5 copies'
          ]
        }
      };
      
      const tierInfo = tierDetails[tier as keyof typeof tierDetails] || tierDetails['basic'];

      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [user_email],
        subject: `🎉 Gift Redeemed - Welcome to Narrated!`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gift Redeemed - Narrated</title>
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(180deg, hsl(35, 25%, 98%), hsl(35, 20%, 96%)); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 8px 32px hsla(220, 25%, 15%, 0.08);">
              <div style="background: linear-gradient(135deg, hsl(220, 50%, 25%), hsl(220, 60%, 35%)); padding: 40px 30px; text-align: center;">
                <h1 style="color: hsl(35, 25%, 98%); margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">Narrated</h1>
                <p style="color: hsl(42, 85%, 65%); margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Welcome to Your Story</p>
              </div>
              
              <div style="padding: 40px 30px;">
                <h2 style="color: hsl(220, 25%, 15%); font-size: 24px; font-weight: 600; margin: 0 0 20px; line-height: 1.3;">
                  🎉 Your gift has been redeemed!
                </h2>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Hi ${user_name || 'there'},
                </p>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Congratulations! You've successfully activated your <strong>${tierInfo.name}</strong> package. Your autobiography journey starts now, and we're excited to help you preserve your life story.
                </p>
                
                <div style="background-color: hsl(35, 15%, 96%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: hsl(220, 25%, 15%); font-size: 18px; font-weight: 600; margin: 0 0 16px; text-align: center;">
                    Your Active Package: ${tierInfo.name}
                  </h3>
                  <ul style="color: hsl(220, 15%, 35%); font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    ${tierInfo.features.map(feature => `<li>${feature}</li>`).join('\n                    ')}
                  </ul>
                </div>
                
                <div style="background-color: hsl(220, 15%, 98%); padding: 20px; border-left: 4px solid hsl(220, 50%, 45%); border-radius: 4px; margin: 20px 0;">
                  <h4 style="color: hsl(220, 25%, 15%); font-size: 16px; font-weight: 600; margin: 0 0 10px;">Next Steps:</h4>
                  <ol style="color: hsl(220, 15%, 35%); font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Log in to your Narrated dashboard</li>
                    <li>Create your first book project</li>
                    <li>Start your guided conversation session</li>
                    <li>Watch as your story comes to life</li>
                  </ol>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://narrated.com.au/dashboard" style="display: inline-block; background: linear-gradient(135deg, hsl(220, 50%, 45%), hsl(220, 60%, 55%)); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px hsla(220, 50%, 45%, 0.3);">
                    Go to Your Dashboard
                  </a>
                </div>
                
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                  Need help getting started? Our support team is here to guide you every step of the way.
                </p>
              </div>
              
              <div style="background-color: hsl(35, 15%, 92%); padding: 30px; text-align: center;">
                <p style="color: hsl(220, 15%, 45%); font-size: 14px; margin: 0 0 10px;">
                  © 2024 Narrated. Preserving life stories with AI assistance.
                </p>
                <p style="color: hsl(220, 15%, 45%); font-size: 12px; margin: 0;">
                  Questions? Contact us at hello@narrated.com.au
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
          JSON.stringify({ error: 'Failed to send gift redemption confirmation email', details: error }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Gift redemption confirmation email sent successfully:', data);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Gift redemption confirmation email sent', data }),
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