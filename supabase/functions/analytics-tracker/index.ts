import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  sessionId: string;
  userId?: string;
  pageViews?: { path: string; timestamp: number }[];
  milestones?: {
    signedUp?: boolean;
    createdBook?: boolean;
    startedProfile?: boolean;
    startedConversation?: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const event: AnalyticsEvent = await req.json();
    
    // Extract geographic data from request headers
    const country = req.headers.get('cf-ipcountry') || 
                    req.headers.get('x-vercel-ip-country') || 
                    null;
    const referrer = req.headers.get('referer') || null;

    console.log('Analytics event received:', { 
      sessionId: event.sessionId, 
      userId: event.userId,
      country,
      pageViewCount: event.pageViews?.length || 0
    });

    // Upsert session data
    const { error: sessionError } = await supabase
      .from('analytics_sessions')
      .upsert({
        session_id: event.sessionId,
        user_id: event.userId || null,
        last_seen_at: new Date().toISOString(),
        country,
        referrer,
        ...(event.milestones || {}),
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false,
      });

    if (sessionError) {
      console.error('Session upsert error:', sessionError);
      throw sessionError;
    }

    // Insert page views if any
    if (event.pageViews && event.pageViews.length > 0) {
      const pageViewRecords = event.pageViews.map(pv => ({
        session_id: event.sessionId,
        page_path: pv.path,
        viewed_at: new Date(pv.timestamp).toISOString(),
      }));

      const { error: pageViewError } = await supabase
        .from('analytics_page_views')
        .insert(pageViewRecords);

      if (pageViewError) {
        console.error('Page view insert error:', pageViewError);
        // Don't throw - page views are less critical
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analytics tracker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
