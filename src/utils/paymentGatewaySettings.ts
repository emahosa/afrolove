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

// Define a default state for when settings are not configured.
// This ensures the app has a predictable and safe state to fall back on.
const defaultSettings: ClientPaymentGatewaySettings = {
  enabled: false,
  activeGateway: 'stripe', // Default to stripe, but 'enabled: false' is the main guard.
  stripe: {
    publicKey: '',
  },
  paystack: {
    publicKey: '',
  },
};

// Cache the settings to avoid repeated database calls within the same session.
let cachedSettings: ClientPaymentGatewaySettings | null = null;

/**
 * Fetches the payment gateway settings from the database.
 * It caches the settings to prevent redundant API calls.
 * @param forceRefetch - When true, bypasses the cache and fetches fresh settings.
 * @returns The client-safe payment gateway settings.
 */
export const getPaymentGatewaySettings = async (forceRefetch = false): Promise<ClientPaymentGatewaySettings> => {
  if (cachedSettings && !forceRefetch) {
    return cachedSettings;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateway_settings')
      .single();

    // "PGRST116" means no row was found, which is not an error in our case.
    // We'll just use the default settings.
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching payment gateway settings:', error);
      // In case of an unexpected database error, return the safe default.
      return defaultSettings;
    }

    if (data?.value) {
      // The value from the DB could contain secret keys, so we cast it to a partial
      // type and carefully pick only the client-safe values to avoid exposing secrets.
      const dbSettings = data.value as Partial<ClientPaymentGatewaySettings>;

      const clientSettings: ClientPaymentGatewaySettings = {
        enabled: dbSettings.enabled ?? false,
        activeGateway: dbSettings.activeGateway ?? 'stripe',
        stripe: {
          publicKey: dbSettings.stripe?.publicKey ?? '',
        },
        paystack: {
          publicKey: dbSettings.paystack?.publicKey ?? '',
        },
      };

      cachedSettings = clientSettings;
      return clientSettings;
    }

    // If no settings exist in the database, cache and return the safe default.
    cachedSettings = defaultSettings;
    return defaultSettings;
  } catch (error) {
    console.error('Unexpected error in getPaymentGatewaySettings:', error);
    // In case of any other error, return the safe default.
    return defaultSettings;
  }
};
