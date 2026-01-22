import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAnalyticsContext } from '@/components/AnalyticsProvider';

const AUTH_TRACKED_KEY = 'auth_signup_tracked';
const NEW_USER_THRESHOLD_MS = 60000; // 60 seconds

/**
 * Global auth tracking hook that runs at app root level.
 * Detects new sign-ups (including OAuth) by checking if the user's
 * created_at timestamp is within the last 60 seconds.
 */
export function useAuthTracking() {
  const { trackMilestone } = useAnalyticsContext();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only track on SIGNED_IN events with a valid user
        if (event !== 'SIGNED_IN' || !session?.user) return;

        // Prevent duplicate tracking in this session
        if (hasTrackedRef.current) return;

        const user = session.user;
        const createdAt = new Date(user.created_at).getTime();
        const now = Date.now();
        const isNewUser = now - createdAt < NEW_USER_THRESHOLD_MS;

        // Check if we've already tracked this user's signup
        const trackedUserId = localStorage.getItem(AUTH_TRACKED_KEY);
        const alreadyTracked = trackedUserId === user.id;

        if (isNewUser && !alreadyTracked) {
          // This is a new sign-up - track it
          trackMilestone('signedUp');
          localStorage.setItem(AUTH_TRACKED_KEY, user.id);
          hasTrackedRef.current = true;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [trackMilestone]);
}
