
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentGatewayClientSettings {
  enabled: boolean;
  activeGateway: 'stripe' | 'paystack';
}

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
          console.error('Error fetching payment gateway settings:', gatewayError);
          return { enabled: false, activeGateway: 'paystack' as const };
        }

        if (gatewayData?.value) {
          let settings: { enabled?: boolean; activeGateway?: string };
          
          // Handle different value types from the database
          if (typeof gatewayData.value === 'string') {
            settings = JSON.parse(gatewayData.value);
          } else if (typeof gatewayData.value === 'object' && gatewayData.value !== null) {
            settings = gatewayData.value as { enabled?: boolean; activeGateway?: string };
          } else {
            settings = {};
          }

          const active = settings.activeGateway;
          const activeGateway: 'stripe' | 'paystack' = active === 'stripe' ? 'stripe' : 'paystack';

          return { 
            enabled: settings.enabled === true,
            activeGateway: activeGateway
          };
        }

        return { enabled: false, activeGateway: 'paystack' as const };
      } catch (error) {
        console.error('Error in usePaymentGatewaySettings:', error);
        return { enabled: false, activeGateway: 'paystack' as const };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};
