
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAffiliateTracking = () => {
  const { user } = useAuth();

  const trackActivity = async (
    activityType: 'signup' | 'subscription_page_visit' | 'subscription_completed',
    metadata?: any
  ) => {
    if (!user) return;

    try {
      // Get referrer code from localStorage (set during registration)
      const referrerCode = localStorage.getItem('affiliate_referrer');
      
      await supabase.functions.invoke('track-affiliate-activity', {
        body: {
          activity_type: activityType,
          referrer_code: referrerCode,
          metadata
        }
      });

      // Clear referrer code after signup to prevent duplicate tracking
      if (activityType === 'signup') {
        localStorage.removeItem('affiliate_referrer');
      }
    } catch (error) {
      console.error('Error tracking affiliate activity:', error);
    }
  };

  // Track signup when user is first authenticated
  useEffect(() => {
    if (user) {
      const hasTrackedSignup = localStorage.getItem('affiliate_signup_tracked');
      if (!hasTrackedSignup) {
        trackActivity('signup');
        localStorage.setItem('affiliate_signup_tracked', 'true');
      }
    }
  }, [user]);

  return { trackActivity };
};
