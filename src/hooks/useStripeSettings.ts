
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStripeSettings = () => {
  return useQuery({
    queryKey: ['stripe-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'stripe_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error fetching Stripe settings:', error);
        return { enabled: true }; // Default to enabled if we can't fetch
      }

      if (!data?.value) {
        return { enabled: true }; // Default to enabled if no setting found
      }

      return data.value as { enabled: boolean };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
