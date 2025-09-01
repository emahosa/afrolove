
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSystemSettings = (key: string) => {
  return useQuery({
    queryKey: ['system-settings', key],
    queryFn: async () => {
      try {
        // Try to use the settings table first
        const { data: settingsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', key)
          .maybeSingle();

        if (settingsData?.value) {
          return settingsData.value;
        }

        // Fallback: return empty object for payment gateway settings
        if (key === 'payment_gateway_settings') {
          return {
            enabled: false,
            mode: 'test',
            activeGateway: 'paystack',
            stripe: {
              test: { publicKey: '', secretKey: '' },
              live: { publicKey: '', secretKey: '' }
            },
            paystack: {
              test: { publicKey: '', secretKey: '' },
              live: { publicKey: '', secretKey: '' }
            }
          };
        }

        return null;
      } catch (error) {
        console.error(`Error fetching system setting ${key}:`, error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
