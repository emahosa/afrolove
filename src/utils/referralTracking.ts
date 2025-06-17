
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const handleReferralParams = async (userId: string) => {
  try {
    // Check if there's a referral code in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (!refCode) {
      console.log('No referral code found in URL');
      return;
    }

    console.log('Found referral code:', refCode);

    // Track the referral
    const { data, error } = await supabase.functions.invoke('track-referral', {
      body: {
        userId: userId,
        referralCode: refCode
      }
    });

    if (error) {
      console.error('Error tracking referral:', error);
      return;
    }

    console.log('Referral tracked successfully:', data);
    
    // Clean up URL params
    if (window.history.replaceState) {
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }

  } catch (error) {
    console.error('Error handling referral params:', error);
  }
};

export const generateReferralLink = (affiliateCode: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/?ref=${affiliateCode}`;
};
