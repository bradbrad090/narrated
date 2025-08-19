import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resendApiKey = Deno.env.get('RESEND_API_KEY')
if (!resendApiKey) {
  console.error('RESEND_API_KEY environment variable is missing')
}
const resend = resendApiKey ? new Resend(resendApiKey) : null
const hookSecret = Deno.env.get('SEND_PASSWORD_RESET_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Handle GET requests for testing
  if (req.method === 'GET') {
    console.log('GET request received for testing')
    const url = new URL(req.url)
    const testEmail = url.searchParams.get('test_email')
    
    console.log('Test email parameter:', testEmail)
    console.log('Resend API key exists:', !!Deno.env.get('RESEND_API_KEY'))
    
    if (!testEmail) {
      console.log('No test email provided, returning usage info')
      return new Response(
        JSON.stringify({ 
          message: 'Password Reset Email Test Endpoint',
          usage: 'Add ?test_email=your-email@example.com to test the email template',
          resend_configured: !!Deno.env.get('RESEND_API_KEY')
        }), 
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // Check if Resend is configured
    if (!resend) {
      console.error('Resend is not configured - missing RESEND_API_KEY')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service is not configured. Missing RESEND_API_KEY.',
          resend_configured: false
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    // Send test email
    try {
      console.log('Generating email template for:', testEmail)
      const html = await renderAsync(
        React.createElement(PasswordResetEmail, {
          supabase_url: 'https://keadkwromhlyvoyxvcmi.supabase.co',
          token: 'test-token-123',
          token_hash: 'test-hash-456',
          redirect_to: 'https://narrated.com.au/auth',
          email_action_type: 'recovery',
          user_email: testEmail,
        })
      )
      console.log('Email template generated successfully')

      console.log('Sending email via Resend...')
      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [testEmail],
        subject: '[TEST] Reset Your Narrated Password',
        html,
      })

      if (error) {
        console.error('Resend API error:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message, details: error }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      console.log('Test email sent successfully to:', testEmail)
      console.log('Resend response:', data)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Test password reset email sent to ${testEmail}`,
          data 
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    } catch (error) {
      console.error('Unexpected error in test function:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          stack: error.stack 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    // If webhook secret is configured, verify the webhook
    if (hookSecret) {
      console.log('Webhook secret found, verifying webhook...')
      const wh = new Webhook(hookSecret)
      try {
        const {
          user,
          email_data: { token, token_hash, redirect_to, email_action_type },
        } = wh.verify(payload, headers) as {
          user: {
            email: string
          }
          email_data: {
            token: string
            token_hash: string
            redirect_to: string
            email_action_type: string
            site_url: string
          }
        }

        console.log('Webhook verified successfully for user:', user.email)

        const html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
            token,
            token_hash,
            redirect_to,
            email_action_type,
            user_email: user.email,
          })
        )

        const { data, error } = await resend.emails.send({
          from: 'Narrated <noreply@narrated.com.au>',
          to: [user.email],
          subject: 'Reset Your Narrated Password',
          html,
        })

        if (error) {
          console.error('Resend error:', error)
          throw error
        }

        console.log('Password reset email sent successfully:', data)

        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        })

      } catch (webhookError) {
        console.error('Webhook verification failed:', webhookError)
        return new Response(
          JSON.stringify({
            error: 'Webhook verification failed',
            details: webhookError.message,
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }
    } else {
      // Handle Supabase auth webhook without secret verification
      console.log('No webhook secret configured, handling Supabase auth webhook directly')
      
      const body = JSON.parse(payload)
      console.log('Webhook payload received:', JSON.stringify(body, null, 2))
      
      // Supabase auth webhook format
      const { user, email_data } = body
      
      if (!user?.email || !email_data) {
        console.error('Invalid webhook payload format')
        return new Response(
          JSON.stringify({ error: 'Invalid webhook payload format' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      // Check if Resend is configured
      if (!resend) {
        console.error('Resend is not configured - missing RESEND_API_KEY')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Email service is not configured. Missing RESEND_API_KEY.' 
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      // Send email in background to prevent timeout
      const sendEmailTask = async () => {
        try {
          console.log('Starting background email task for:', user.email)
          
          const html = await renderAsync(
            React.createElement(PasswordResetEmail, {
              supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
              token: email_data.token,
              token_hash: email_data.token_hash,
              redirect_to: email_data.redirect_to,
              email_action_type: email_data.email_action_type,
              user_email: user.email,
            })
          )

          const { data, error } = await resend.emails.send({
            from: 'Narrated <noreply@narrated.com.au>',
            to: [user.email],
            subject: 'Reset Your Narrated Password',
            html,
          })

          if (error) {
            console.error('Resend error in background task:', error)
            throw error
          }

          console.log('Password reset email sent successfully in background:', data)
        } catch (error) {
          console.error('Error in background email task:', error)
        }
      }

      // Start background task
      EdgeRuntime.waitUntil(sendEmailTask())

      // Return immediate response to prevent webhook timeout
      return new Response(JSON.stringify({ success: true, message: 'Email queued for sending' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    }
  } catch (error) {
    console.error('Error in send-password-reset function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})