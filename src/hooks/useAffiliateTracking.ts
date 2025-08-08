
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAffiliateTracking = () => {
  const { user } = useAuth();

  // Get user's IP address and device ID
  const getUserInfo = async () => {
    try {
      // Get IP address
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
      
      // Generate or get device ID from localStorage
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('device_id', deviceId);
      }

      return { ip_address: ip, device_id: deviceId };
    } catch (error) {
      console.error('Error getting user info:', error);
      return { ip_address: null, device_id: crypto.randomUUID() };
    }
  };

  const trackActivity = async (
    activityType: 'signup' | 'subscription_page_visit' | 'subscription_completed',
    metadata?: any
  ) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('track-affiliate-activity', {
        body: {
          activity_type: activityType,
          metadata
        }
      });
    } catch (error) {
      console.error('Error tracking affiliate activity:', error);
    }
  };

  // Track user registration with IP and device ID
  const trackRegistration = async () => {
    if (!user) return;

    try {
      const hasTrackedRegistration = localStorage.getItem('registration_tracked');
      if (hasTrackedRegistration) return;

      const userInfo = await getUserInfo();
      const referrerCode = localStorage.getItem('affiliate_referrer');

      await supabase.functions.invoke('track-user-registration', {
        body: {
          ...userInfo,
          referrer_code: referrerCode
        }
      });

      localStorage.setItem('registration_tracked', 'true');
      localStorage.removeItem('affiliate_referrer');
    } catch (error) {
      console.error('Error tracking registration:', error);
    }
  };

  // Track user registration when user is first authenticated
  useEffect(() => {
    if (user) {
      trackRegistration();
    }
  }, [user]);

  return { trackActivity };
};
