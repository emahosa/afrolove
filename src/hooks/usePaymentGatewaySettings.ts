import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePaymentGatewaySettings = () => {
  return useQuery({
    queryKey: ['payment-gateway-settings'],
    queryFn: async () => {
      try {
        // Check for payment gateway settings first
        const { data: gatewayData, error: gatewayError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'payment_gateway_settings')
          .maybeSingle();

        if (gatewayError && gatewayError.code !== 'PGRST116') {
          console.error('Error fetching payment gateway settings:', gatewayError);
          return { enabled: false }; // Default to disabled if we can't fetch
        }

        if (gatewayData?.value) {
          const settings = gatewayData.value as { enabled?: boolean; activeGateway?: string };
          return { 
            enabled: settings.enabled === true,
            activeGateway: settings.activeGateway || 'stripe'
          };
        }

        // If no settings are found, or if the value is null, default to disabled.
        return { enabled: false };
      } catch (error) {
        console.error('Error in useStripeSettings:', error);
        return { enabled: false };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};