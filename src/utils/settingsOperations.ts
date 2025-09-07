import { supabase } from '@/integrations/supabase/client';

export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      // It's okay if the setting doesn't exist, so don't log an error for that
      if (error.code !== 'PGRST116') {
        console.error(`Error fetching setting ${key}:`, error);
      }
      return null;
    }

    return data ? (data as any).value : null;
  } catch (error) {
    console.error(`Error in getSetting for ${key}:`, error);
    return null;
  }
};

export const updateSetting = async (key: string, value: string, category: string): Promise<boolean> => {
  try {
    // This is an admin operation, so it should be called from a secure context (e.g., a serverless function)
    // For client-side admin panels, ensure RLS is properly configured.
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value, category }, { onConflict: 'key' });

    if (error) {
      console.error(`Error updating setting ${key}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error in updateSetting for ${key}:`, error);
    return false;
  }
};
