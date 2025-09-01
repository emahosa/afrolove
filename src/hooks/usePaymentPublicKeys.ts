import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentGatewayKeys {
  stripe: {
    live: { publicKey: string };
    test: { publicKey: string };
  };
  paystack: {
    live: { publicKey: string };
    test: { publicKey: string };
  };
  mode: 'live' | 'test';
}

interface PublicKeys {
  stripePublicKey?: string;
  paystackPublicKey?: string;
}

export const usePaymentPublicKeys = () => {
  return useQuery<PublicKeys>({
    queryKey: ['payment-public-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'payment_gateway_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching payment public keys:', error);
        return {};
      }

      if (data?.value) {
        const settings = data.value as PaymentGatewayKeys;
        const mode = settings.mode || 'test';

        return {
          stripePublicKey: mode === 'live' ? settings.stripe?.live?.publicKey : settings.stripe?.test?.publicKey,
          paystackPublicKey: mode === 'live' ? settings.paystack?.live?.publicKey : settings.paystack?.test?.publicKey,
        };
      }

      return {};
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
