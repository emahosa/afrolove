import { supabase } from '@/integrations/supabase/client';

export interface ClientPaymentGatewaySettings {
  enabled: boolean;
  activeGateway: 'stripe' | 'paystack';
  stripe: {
    publicKey: string;
  };
  paystack: {
    publicKey: string;
  };
}

const defaultSettings: ClientPaymentGatewaySettings = {
  enabled: false,
  activeGateway: 'stripe',
  stripe: {
    publicKey: '',
  },
  paystack: {
    publicKey: '',
  },
};

/**
 * Fetches the payment gateway settings by calling a secure Supabase edge function.
 * This avoids exposing a database table with potentially sensitive info directly to the client.
 * Caching is handled by react-query in the `usePaymentGatewaySettings` hook.
 * @returns The client-safe payment gateway settings.
 */
export const getPaymentGatewaySettings = async (): Promise<ClientPaymentGatewaySettings> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-payment-settings');

    if (error) {
      console.error('Error fetching payment gateway settings via function:', error);
      return defaultSettings;
    }

    // The invoked function should return data matching the ClientPaymentGatewaySettings interface.
    // We cast it to ensure type safety.
    return data as ClientPaymentGatewaySettings;
  } catch (error) {
    console.error('Unexpected error in getPaymentGatewaySettings:', error);
    // In case of a network error or other unexpected issue, return the safe default.
    return defaultSettings;
  }
};
