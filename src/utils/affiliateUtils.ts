
export const handleAffiliateReferral = () => {
  // Check URL for referral code
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    // Store referral code in localStorage for later tracking
    localStorage.setItem('affiliate_referrer', refCode);
    console.log('Affiliate referral code stored:', refCode);
    
    // Clean URL by removing the ref parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('ref');
    window.history.replaceState({}, document.title, newUrl.toString());
  }
};

export const getStoredReferrer = (): string | null => {
  return localStorage.getItem('affiliate_referrer');
};

export const clearReferrer = () => {
  localStorage.removeItem('affiliate_referrer');
};

// Track affiliate activity for all user types
export const trackAffiliateActivity = async (activityType: string, metadata?: any) => {
  const referrerCode = getStoredReferrer();
  
  if (referrerCode) {
    try {
      // Import supabase client dynamically to avoid circular imports
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase.functions.invoke('track-affiliate-activity', {
        body: {
          activity_type: activityType,
          referrer_code: referrerCode,
          metadata
        }
      });

      if (error) {
        console.error('Failed to track affiliate activity:', error);
      } else {
        console.log('Affiliate activity tracked:', activityType);
      }

      // Clear referrer after successful signup to prevent duplicate tracking
      if (activityType === 'signup') {
        clearReferrer();
      }
    } catch (error) {
      console.error('Error tracking affiliate activity:', error);
    }
  }
};
