import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientApiKeys {
  publicKey: string;
}

interface ClientGatewayConfig {
  test: Partial<ClientApiKeys>;
  live: Partial<ClientApiKeys>;
}

/**
 * @description Defines the client-safe settings for the payment gateway.
 */
export interface PaymentGatewayClientSettings {
  enabled: boolean;
  mode: 'test' | 'live';
  activeGateway: 'stripe' | 'paystack';
  stripe: ClientGatewayConfig;
  paystack: ClientGatewayConfig;
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
    queryFn: async (): Promise<PaymentGatewayClientSettings> => {
      const defaultClientSettings: PaymentGatewayClientSettings = {
        enabled: false,
        mode: 'test',
        activeGateway: 'paystack',
        stripe: { test: {}, live: {} },
        paystack: { test: {}, live: {} },
      };

      try {
        const { data: gatewayData, error: gatewayError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'payment_gateway_settings')
          .maybeSingle();

        if (gatewayError && gatewayError.code !== 'PGRST116') {
          console.error('Error fetching payment gateway settings:', gatewayError);
          return defaultClientSettings;
        }

        if (gatewayData?.value) {
          let settings: any;
          if (typeof gatewayData.value === 'string') {
            console.warn('gatewayData.value was stringified JSON, parsing now.');
            settings = JSON.parse(gatewayData.value);
          } else {
            settings = gatewayData.value;
          }

          const activeGateway: 'stripe' | 'paystack' = settings.activeGateway === 'stripe' ? 'stripe' : 'paystack';

          return { 
            enabled: settings.enabled === true,
            mode: settings.mode === 'live' ? 'live' : 'test',
            activeGateway: activeGateway,
            stripe: {
              test: { publicKey: settings.stripe?.test?.publicKey || '' },
              live: { publicKey: settings.stripe?.live?.publicKey || '' }
            },
            paystack: {
              test: { publicKey: settings.paystack?.test?.publicKey || '' },
              live: { publicKey: settings.paystack?.live?.publicKey || '' }
            }
          };
        }

        return defaultClientSettings;
      } catch (error) {
        console.error('Error in usePaymentGatewaySettings:', error);
        return defaultClientSettings;
      }
    },
    // Cache the settings for 5 minutes to reduce unnecessary database calls.
    // The settings are not expected to change frequently for a single user session.
    staleTime: 5 * 60 * 1000,
  });
};