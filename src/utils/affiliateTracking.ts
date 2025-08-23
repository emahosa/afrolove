
import { supabase } from '@/integrations/supabase/client';

export const trackAffiliateClick = async (referralCode: string) => {
  try {
    // Store referral code in localStorage for later use during registration
    localStorage.setItem('affiliate_referrer', referralCode);
    
    // Track the click using the new edge function
    const { error } = await supabase.functions.invoke('track-affiliate-link-click', {
      body: { referral_code: referralCode }
    });
    
    if (error) {
      console.error('Error tracking affiliate click:', error);
    } else {
      console.log('Affiliate click tracked successfully');
    }
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
  }
};

export const trackReferredUserSignup = async (referralCode: string) => {
  try {
    const { error } = await supabase.functions.invoke('track-referred-user-signup', {
      body: { referral_code: referralCode }
    });
    
    if (error) {
      console.error('Error tracking referred user signup:', error);
    } else {
      console.log('Referred user signup tracked successfully');
    }
  } catch (error) {
    console.error('Error tracking referred user signup:', error);
  }
};

export const trackSubscriptionPageVisit = async () => {
  try {
    const { error } = await supabase.functions.invoke('track-subscription-page-visit');
    
    if (error) {
      console.error('Error tracking subscription page visit:', error);
    } else {
      console.log('Subscription page visit tracked successfully');
    }
  } catch (error) {
    console.error('Error tracking subscription page visit:', error);
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
  // Only track if we haven't already processed this referral in this session
  const hasProcessedReferral = sessionStorage.getItem('processed_referral');
  if (!hasProcessedReferral) {
    handleAffiliateReferral();
    sessionStorage.setItem('processed_referral', 'true');
  }
};

// Track signup after registration
export const trackSignupWithReferral = async () => {
  const referralCode = localStorage.getItem('affiliate_referrer');
  if (referralCode) {
    await trackReferredUserSignup(referralCode);
    // Clear the stored referral code after successful signup tracking
    localStorage.removeItem('affiliate_referrer');
  }
};
