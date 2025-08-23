import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AFFILIATE_CODE_KEY = 'aff_code';
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const useAffiliateTracking = () => {
  useEffect(() => {
    const trackAffiliateCode = async () => {
      try {
        const url = new URL(window.location.href);
        const refCode = url.searchParams.get('ref');

        if (refCode) {
          // Store the code in localStorage and a cookie
          localStorage.setItem(AFFILIATE_CODE_KEY, refCode);
          document.cookie = `${AFFILIATE_CODE_KEY}=${refCode}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;

          // Log the click event. This is fire-and-forget.
          supabase.functions.invoke('affiliate-log-click', {
            body: {
              code: refCode,
              landing_url: window.location.href,
              referrer_url: document.referrer,
            },
          }).catch(error => {
            // It's not critical if this fails, so just log the error
            console.warn('Failed to log affiliate click:', error.message);
          });

          // Optional: Clean the URL so the ref code isn't shared accidentally.
          // url.searchParams.delete('ref');
          // window.history.replaceState({}, document.title, url.toString());
        }
      } catch (error) {
        // This can happen if the URL is invalid, etc.
        console.error('Error in affiliate tracking:', error);
      }
    };

    trackAffiliateCode();
  }, []); // The empty dependency array ensures this runs only once on initial mount
};
