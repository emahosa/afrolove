import { supabase } from '@/integrations/supabase/client';

export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }

    return data ? data.value : null;
  } catch (error) {
    console.error(`Error in getSetting for ${key}:`, error);
    return null;
  }
};

export const updateSetting = async (key: string, value: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });

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
