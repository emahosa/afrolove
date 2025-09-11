import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * @description Defines the client-safe settings for the payment gateway.
 */
interface PaymentGatewayClientSettings {
  enabled: boolean;
  activeGateway: 'stripe' | 'paystack';
}

/**
 * @description Hook to fetch the current payment gateway settings from the database.
 * This hook is intended for client-side use to determine if the payment UI should be enabled
 * and which gateway is active. It does NOT expose any secret keys.
 *
 * @returns An object with:
 *  - `enabled`: A boolean indicating if the payment system is turned on. Defaults to `false`.
 *  - `activeGateway`: The identifier for the active payment gateway. Defaults to 'paystack'.
 */
export const usePaymentGatewaySettings = () => {
  return useQuery<PaymentGatewayClientSettings>({
    queryKey: ['payment-gateway-settings'],
    queryFn: async () => {
      try {
        const { data: gatewayData, error: gatewayError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'payment_gateway_settings')
          .maybeSingle();

        if (gatewayError && gatewayError.code !== 'PGRST116') {
          // PGRST116 is the error code for "Not Found", which is expected if settings are not yet saved.
          console.error('Error fetching payment gateway settings:', gatewayError);
          return { enabled: false, activeGateway: 'paystack' };
        }

        if (gatewayData?.value) {
          let settings: { enabled?: boolean; activeGateway?: string };
          if (typeof gatewayData.value === 'string') {
            console.warn('gatewayData.value was stringified JSON, parsing now.');
            settings = JSON.parse(gatewayData.value);
          } else {
            settings = gatewayData.value as { enabled?: boolean; activeGateway?: string };
          }

          const active = settings.activeGateway;
          const activeGateway: 'stripe' | 'paystack' = active === 'stripe' ? 'stripe' : 'paystack';

          return { 
            enabled: settings.enabled === true,
            activeGateway: activeGateway
          };
        }

        // If no settings row is found, or if the value is null, default to disabled.
        // This is a safe default to prevent users from attempting payments if the system isn't configured.
        return { enabled: false, activeGateway: 'paystack' };
      } catch (error) {
        console.error('Error in usePaymentGatewaySettings:', error);
        // In case of any unexpected error, default to disabled for safety.
        return { enabled: false, activeGateway: 'paystack' };
      }
    },
    // Cache the settings for 5 minutes to reduce unnecessary database calls.
    // The settings are not expected to change frequently for a single user session.
    staleTime: 5 * 60 * 1000,
  });
};