import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * @description Hook to fetch the current payment gateway settings from the database.
 * This hook is intended for client-side use to determine if the payment UI should be enabled
 * and which gateway is active. It does NOT expose any secret keys.
 *
 * @returns An object with:
 *  - `enabled`: A boolean indicating if the payment system is turned on. Defaults to `false`.
 *  - `activeGateway`: The identifier for the active payment gateway (e.g., 'stripe'). Defaults to 'stripe'.
 */
export const usePaymentGatewaySettings = () => {
  return useQuery({
    queryKey: ['payment-gateway-settings'],
    queryFn: async () => {
      try {
        const { data: gatewayData, error: gatewayError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'Payment_Gateway_Settings')
          .maybeSingle();

        if (gatewayError && gatewayError.code !== 'PGRST116') {
          // PGRST116 is the error code for "Not Found", which is expected if settings are not yet saved.
          console.error('Error fetching payment gateway settings:', gatewayError);
          return { enabled: false, activeGateway: 'stripe' };
        }

        if (gatewayData?.value) {
          const settings = gatewayData.value as { enabled?: boolean; activeGateway?: string };
          return { 
            enabled: settings.enabled === true,
            activeGateway: settings.activeGateway || 'stripe'
          };
        }

        // If no settings row is found, or if the value is null, default to disabled.
        // This is a safe default to prevent users from attempting payments if the system isn't configured.
        return { enabled: false, activeGateway: 'stripe' };
      } catch (error) {
        console.error('Error in usePaymentGatewaySettings:', error);
        // In case of any unexpected error, default to disabled for safety.
        return { enabled: false, activeGateway: 'stripe' };
      }
    },
    // Cache the settings for 5 minutes to reduce unnecessary database calls.
    // The settings are not expected to change frequently for a single user session.
    staleTime: 5 * 60 * 1000,
  });
};