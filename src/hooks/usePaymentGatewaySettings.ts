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

        // Fallback to legacy stripe_enabled setting
        const { data: legacyData, error: legacyError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'stripe_enabled')
          .maybeSingle();

        if (legacyError) {
          console.error('Error fetching legacy Stripe settings:', legacyError);
          return { enabled: false };
        }

        if (legacyData?.value) {
          return legacyData.value as { enabled: boolean };
        }

        // Default to disabled if no settings found
        return { enabled: false };
      } catch (error) {
        console.error('Error in useStripeSettings:', error);
        return { enabled: false };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};