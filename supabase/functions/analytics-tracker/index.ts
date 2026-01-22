import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PageView {
  path: string;
  timestamp: number;
}

interface AnalyticsEvent {
  sessionId: string;
  userId?: string;
  pageViews?: PageView[];
  milestones?: {
    signedUp?: boolean;
    createdBook?: boolean;
    startedProfile?: boolean;
    startedConversation?: boolean;
  };
}

// UUID v4 regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validation constants
const MAX_PAGE_PATH_LENGTH = 500;
const MAX_PAGE_VIEWS_PER_REQUEST = 50;
const MAX_SESSION_ID_LENGTH = 100;

/**
 * Validates a UUID string format
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Validates and sanitizes the analytics event payload
 */
function validateAndSanitizeEvent(event: unknown): { valid: boolean; sanitized?: AnalyticsEvent; error?: string } {
  if (!event || typeof event !== 'object') {
    return { valid: false, error: 'Invalid event payload' };
  }

  const e = event as Record<string, unknown>;

  // Validate sessionId - required and must be reasonable format
  if (!e.sessionId || typeof e.sessionId !== 'string') {
    return { valid: false, error: 'Missing or invalid sessionId' };
  }
  
  const sessionId = e.sessionId.trim();
  if (sessionId.length === 0 || sessionId.length > MAX_SESSION_ID_LENGTH) {
    return { valid: false, error: 'sessionId length invalid' };
  }

  // Validate userId if provided - must be valid UUID
  let userId: string | undefined;
  if (e.userId !== undefined && e.userId !== null) {
    if (typeof e.userId !== 'string') {
      return { valid: false, error: 'userId must be a string' };
    }
    if (!isValidUUID(e.userId)) {
      return { valid: false, error: 'userId must be a valid UUID' };
    }
    userId = e.userId;
  }

  // Validate and sanitize pageViews
  let pageViews: PageView[] | undefined;
  if (e.pageViews !== undefined) {
    if (!Array.isArray(e.pageViews)) {
      return { valid: false, error: 'pageViews must be an array' };
    }
    
    if (e.pageViews.length > MAX_PAGE_VIEWS_PER_REQUEST) {
      return { valid: false, error: `pageViews exceeds maximum of ${MAX_PAGE_VIEWS_PER_REQUEST}` };
    }

    pageViews = [];
    for (const pv of e.pageViews) {
      if (!pv || typeof pv !== 'object') {
        return { valid: false, error: 'Invalid pageView entry' };
      }
      
      const pvObj = pv as Record<string, unknown>;
      
      if (typeof pvObj.path !== 'string' || typeof pvObj.timestamp !== 'number') {
        return { valid: false, error: 'pageView missing path or timestamp' };
      }

      // Sanitize path - truncate if too long, remove control characters
      let path = pvObj.path.slice(0, MAX_PAGE_PATH_LENGTH);
      path = path.replace(/[\x00-\x1f\x7f]/g, ''); // Remove control characters

      // Validate timestamp is reasonable (within last 24 hours and not in future)
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const timestamp = pvObj.timestamp;
      
      if (timestamp < oneDayAgo || timestamp > now + 60000) {
        // Skip invalid timestamps silently rather than rejecting entire request
        continue;
      }

      pageViews.push({ path, timestamp });
    }
  }

  // Validate milestones if provided
  let milestones: AnalyticsEvent['milestones'];
  if (e.milestones !== undefined) {
    if (typeof e.milestones !== 'object' || e.milestones === null) {
      return { valid: false, error: 'milestones must be an object' };
    }
    
    const m = e.milestones as Record<string, unknown>;
    milestones = {};
    
    // Only accept boolean true values for milestones
    if (m.signedUp === true) milestones.signedUp = true;
    if (m.createdBook === true) milestones.createdBook = true;
    if (m.startedProfile === true) milestones.startedProfile = true;
    if (m.startedConversation === true) milestones.startedConversation = true;
  }

  return {
    valid: true,
    sanitized: {
      sessionId,
      userId,
      pageViews,
      milestones,
    },
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse and validate request body
    let rawEvent: unknown;
    try {
      rawEvent = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize the event
    const validation = validateAndSanitizeEvent(rawEvent);
    if (!validation.valid || !validation.sanitized) {
      console.warn('Analytics validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = validation.sanitized;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If userId is provided, validate it exists in auth.users
    if (event.userId) {
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', event.userId)
        .maybeSingle();
      
      if (!userExists) {
        // Don't expose that user doesn't exist, just ignore the userId
        console.warn('Analytics: userId not found, ignoring:', event.userId);
        event.userId = undefined;
      }
    }

    const referrer = req.headers.get('referer') || null;

    console.log('Analytics event received:', { 
      sessionId: event.sessionId, 
      userId: event.userId,
      pageViewCount: event.pageViews?.length || 0
    });

    // Build milestone data with snake_case column names
    // IMPORTANT: Only set milestone flags to true, never overwrite existing true values with false
    const milestoneData: Record<string, boolean> = {};
    if (event.milestones?.signedUp === true) milestoneData.signed_up = true;
    if (event.milestones?.createdBook === true) milestoneData.created_book = true;
    if (event.milestones?.startedProfile === true) milestoneData.started_profile = true;
    if (event.milestones?.startedConversation === true) milestoneData.started_conversation = true;

    console.log('Processing milestones:', milestoneData);

    // Upsert session data
    const { error: sessionError } = await supabase
      .from('analytics_sessions')
      .upsert({
        session_id: event.sessionId,
        user_id: event.userId || null,
        last_seen_at: new Date().toISOString(),
        referrer,
        ...milestoneData,
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
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
