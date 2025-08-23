
import { useCallback } from 'react';
import { trackSubscriptionPageVisit, trackSignupWithReferral } from '@/utils/affiliateTracking';

export const useAffiliateTracking = () => {
  const trackSubscriptionVisit = useCallback(async () => {
    await trackSubscriptionPageVisit();
  }, []);

  const trackRegistration = useCallback(async () => {
    await trackSignupWithReferral();
  }, []);

  return {
    trackSubscriptionPageVisit: trackSubscriptionVisit,
    trackRegistration,
  };
};
