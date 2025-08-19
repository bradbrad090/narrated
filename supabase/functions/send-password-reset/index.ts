import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
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
    const url = new URL(req.url)
    const testEmail = url.searchParams.get('test_email')
    
    if (!testEmail) {
      return new Response(
        JSON.stringify({ 
          message: 'Password Reset Email Test Endpoint',
          usage: 'Add ?test_email=your-email@example.com to test the email template'
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

    // Send test email
    try {
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

      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [testEmail],
        subject: '[TEST] Reset Your Narrated Password',
        html,
      })

      if (error) {
        console.error('Test email error:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      console.log('Test email sent successfully:', data)
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
      console.error('Test email error:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
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
      // Fallback: handle direct API calls (not recommended for production)
      console.log('No webhook secret configured, handling direct call')
      
      const body = JSON.parse(payload)
      const { email, reset_url } = body

      if (!email || !reset_url) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: email, reset_url' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      // Extract parameters from reset_url for the template
      const url = new URL(reset_url)
      const token_hash = url.searchParams.get('token') || ''
      const email_action_type = url.searchParams.get('type') || 'recovery'
      const redirect_to = url.searchParams.get('redirect_to') || ''

      const html = await renderAsync(
        React.createElement(PasswordResetEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token: token_hash,
          token_hash,
          redirect_to,
          email_action_type,
          user_email: email,
        })
      )

      const { data, error } = await resend.emails.send({
        from: 'Narrated <noreply@narrated.com.au>',
        to: [email],
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