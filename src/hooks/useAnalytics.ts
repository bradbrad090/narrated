import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface PageView {
  path: string;
  timestamp: number;
}

interface AnalyticsMilestones {
  signedUp?: boolean;
  createdBook?: boolean;
  startedProfile?: boolean;
  startedConversation?: boolean;
}

const BATCH_INTERVAL = 30000; // 30 seconds
const SESSION_ID_KEY = 'analytics_session_id';

// Generate or retrieve session ID
function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function useAnalytics() {
  const location = useLocation();
  const batchRef = useRef<PageView[]>([]);
  const timerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>(getSessionId());
  const lastPathRef = useRef<string>('');

  // Send batched events to analytics
  const sendBatch = useCallback(async (milestones?: AnalyticsMilestones) => {
    if (batchRef.current.length === 0 && !milestones) return;

    const payload = {
      sessionId: sessionIdRef.current,
      userId: (await supabase.auth.getUser()).data.user?.id,
      pageViews: batchRef.current.length > 0 ? [...batchRef.current] : undefined,
      milestones,
    };

    // Use sendBeacon for reliability (works even during page unload)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const sent = navigator.sendBeacon(
      `https://keadkwromhlyvoyxvcmi.supabase.co/functions/v1/analytics-tracker`,
      blob
    );

    if (!sent) {
      // Fallback to fetch if sendBeacon fails
      try {
        await fetch(`https://keadkwromhlyvoyxvcmi.supabase.co/functions/v1/analytics-tracker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error('Analytics tracking failed:', error);
      }
    }

    // Clear batch
    batchRef.current = [];
  }, []);

  // Track page view
  const trackPageView = useCallback((path: string) => {
    // Avoid duplicate tracking for same path
    if (path === lastPathRef.current) return;
    
    lastPathRef.current = path;
    batchRef.current.push({
      path,
      timestamp: Date.now(),
    });

    // Reset timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Schedule batch send
    timerRef.current = window.setTimeout(() => {
      sendBatch();
    }, BATCH_INTERVAL);
  }, [sendBatch]);

  // Track milestone
  const trackMilestone = useCallback((milestone: keyof AnalyticsMilestones) => {
    sendBatch({ [milestone]: true });
  }, [sendBatch]);

  // Track page changes
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  // Send on unmount
  useEffect(() => {
    return () => {
      if (batchRef.current.length > 0) {
        sendBatch();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [sendBatch]);

  return { trackMilestone };
}
