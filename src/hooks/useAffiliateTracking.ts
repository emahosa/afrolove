
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAffiliateTracking = () => {
  const trackSubscriptionPageVisit = useCallback(async () => {
    try {
      await supabase.functions.invoke('track-subscription-page-visit');
    } catch (error) {
      console.error('Error tracking subscription page visit:', error);
    }
  }, []);

  const trackRegistration = useCallback(async () => {
    try {
      await supabase.functions.invoke('track-user-registration');
    } catch (error) {
      console.error('Error tracking registration:', error);
    }
  }, []);

  return {
    trackSubscriptionPageVisit,
    trackRegistration,
  };
};
