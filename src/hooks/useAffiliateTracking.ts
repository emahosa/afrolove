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

  // Track subscription page visit (triggers free referral bonus)
  const trackSubscriptionPageVisit = async () => {
    if (!user) return;

    try {
      await supabase.functions.invoke('track-subscription-page-visit');
      console.log('Subscription page visit tracked successfully');
    } catch (error) {
      console.error('Error tracking subscription page visit:', error);
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
      console.log('User registration tracked successfully');
      
      // Don't remove referrer code yet - keep it for subscription tracking
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

  return { 
    trackSubscriptionPageVisit,
    trackRegistration 
  };
};
