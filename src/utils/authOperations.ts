
import { supabase } from '@/integrations/supabase/client';
import { generateDeviceId, getClientIP, getStoredReferrer } from './affiliateUtils';

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  referralCode?: string | null
) => {
  try {
    // Get device ID and IP address
    const deviceId = generateDeviceId();
    const ipAddress = await getClientIP();
    
    // Get referrer code from localStorage if not provided
    const finalReferralCode = referralCode || getStoredReferrer();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          device_id: deviceId,
          registration_ip: ipAddress,
          referral_code: finalReferralCode
        }
      }
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Registration error:', error);
    return { data: null, error };
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Login error:', error);
    return { data: null, error };
  }
};
