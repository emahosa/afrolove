
import { supabase } from '@/integrations/supabase/client';

export const trackAffiliateClick = async (referralCode: string) => {
  try {
    // Store referral code in localStorage for later use during registration
    localStorage.setItem('affiliate_referrer', referralCode);
    
    // Track the click
    await supabase.functions.invoke('track-affiliate-click', {
      body: { referral_code: referralCode }
    });
    
    console.log('Affiliate click tracked successfully');
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
  }
};

// Check for referral code in URL and track click
export const handleAffiliateReferral = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  
  if (referralCode) {
    trackAffiliateClick(referralCode);
  }
};

// Call this function when the app loads
export const initializeAffiliateTracking = () => {
  // Only track if we haven't already processed this referral
  const hasProcessedReferral = localStorage.getItem('processed_referral');
  if (!hasProcessedReferral) {
    handleAffiliateReferral();
    localStorage.setItem('processed_referral', 'true');
  }
};
