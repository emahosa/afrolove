
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useStripeSettings = () => {
  const [isStripeEnabled, setIsStripeEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStripeSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'stripe_enabled')
          .maybeSingle();

        if (!error && data?.value && typeof data.value === 'object') {
          const settingValue = data.value as { enabled?: boolean };
          setIsStripeEnabled(settingValue.enabled === true);
        } else {
          // Default to enabled if no setting found
          setIsStripeEnabled(true);
        }
      } catch (error) {
        console.error('Error checking Stripe settings:', error);
        // Default to enabled on error
        setIsStripeEnabled(true);
      } finally {
        setLoading(false);
      }
    };

    checkStripeSettings();
  }, []);

  return { isStripeEnabled, loading };
};
