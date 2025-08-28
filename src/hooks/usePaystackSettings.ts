import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePaystackSettings = () => {
  return useQuery({
    queryKey: ['paystack-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['paystack_enabled', 'paystack_public_key']);

      if (error) {
        console.error('Error fetching Paystack settings:', error);
        return { enabled: false, publicKey: '' };
      }

      if (!data) {
        return { enabled: false, publicKey: '' };
      }

      const settings = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      return {
        enabled: settings.paystack_enabled?.enabled === true,
        publicKey: settings.paystack_public_key?.key || '',
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
