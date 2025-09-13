import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { ChapterSubmissionEmail } from './_templates/chapter-submission.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChapterSubmissionRequest {
  chapter_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  chapter_title: string;
  chapter_number: number;
  is_first_submission: boolean;
  submitted_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize services
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: ChapterSubmissionRequest = await req.json();
    const {
      chapter_id,
      user_id,
      user_email,
      user_name,
      chapter_title,
      chapter_number,
      is_first_submission,
      submitted_at
    } = body;

    console.log('Processing chapter submission email:', {
      chapter_id,
      user_id,
      user_email,
      chapter_title,
      chapter_number,
      is_first_submission
    });

    // Validate required fields
    if (!user_email || !user_name || !chapter_title) {
      console.error('Missing required fields:', { user_email, user_name, chapter_title });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email was already sent to prevent duplicates
    const { data: existingLog } = await supabase
      .from('chapter_email_logs')
      .select('id')
      .eq('chapter_id', chapter_id)
      .eq('user_id', user_id)
      .eq('email_type', is_first_submission ? 'first_chapter_welcome' : 'submission_confirmation')
      .eq('email_status', 'sent')
      .single();

    if (existingLog) {
      console.log('Email already sent for this chapter submission');
      return new Response(
        JSON.stringify({ message: 'Email already sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Render email template
    const appUrl = supabaseUrl.replace('.supabase.co', '').replace('https://', 'https://') + '.lovableproject.com';
    
    const emailHtml = await renderAsync(
      React.createElement(ChapterSubmissionEmail, {
        user_name,
        chapter_title,
        chapter_number,
        is_first_submission,
        submitted_at,
        app_url: appUrl
      })
    );

    // Send email
    const emailSubject = is_first_submission 
      ? `🎉 Congratulations on your first chapter submission!`
      : `✅ Chapter ${chapter_number} "${chapter_title}" submitted successfully`;

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'Your Autobiography <noreply@yourdomain.com>',
      to: [user_email],
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      
      // Log failed email attempt
      await supabase
        .from('chapter_email_logs')
        .insert({
          chapter_id,
          user_id,
          email_type: is_first_submission ? 'first_chapter_welcome' : 'submission_confirmation',
          email_status: 'failed',
          error_message: emailError.message
        });

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', emailResult);

    // Log successful email
    await supabase
      .from('chapter_email_logs')
      .insert({
        chapter_id,
        user_id,
        email_type: is_first_submission ? 'first_chapter_welcome' : 'submission_confirmation',
        email_status: 'sent'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        email_id: emailResult?.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-chapter-email function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);