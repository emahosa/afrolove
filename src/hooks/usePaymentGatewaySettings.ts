import { useQuery } from '@tanstack/react-query';
import { getPaymentGatewaySettings } from '@/utils/paymentGatewaySettings';

/**
 * A React Query hook to fetch and cache the application's payment gateway settings.
 *
 * @returns {object} The state of the query, including `data` (the settings),
 * `isLoading`, `isError`, etc.
 */
export const usePaymentGatewaySettings = () => {
  return useQuery({
    queryKey: ['payment-gateway-settings'],
    queryFn: () => getPaymentGatewaySettings(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch if user comes back to the window
  });
};
