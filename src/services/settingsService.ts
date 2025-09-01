
import { supabase } from '@/integrations/supabase/client';

export interface SystemSettings {
  general: {
    siteName: string;
    supportEmail: string;
    maximumFileSize: number;
    autoDeleteDays: number;
  };
  api: {
    rateLimit: number;
    cacheDuration: number;
    enableThrottling: boolean;
    logApiCalls: boolean;
  };
  security: {
    passwordMinLength: number;
    passwordRequiresSymbol: boolean;
    sessionTimeout: number;
    twoFactorEnabled: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    songCompletionNotices: boolean;
    systemAnnouncements: boolean;
    marketingEmails: boolean;
  };
  adminProfile: {
    adminType: string;
    joinedDate: string;
    email: string;
  };
}

export const defaultSettings: SystemSettings = {
  general: {
    siteName: "MelodyVerse",
    supportEmail: "support@melodyverse.com",
    maximumFileSize: 50,
    autoDeleteDays: 30
  },
  api: {
    rateLimit: 100,
    cacheDuration: 15,
    enableThrottling: true,
    logApiCalls: true
  },
  security: {
    passwordMinLength: 8,
    passwordRequiresSymbol: true,
    sessionTimeout: 60,
    twoFactorEnabled: false
  },
  notifications: {
    emailNotifications: true,
    songCompletionNotices: true,
    systemAnnouncements: true,
    marketingEmails: false
  },
  adminProfile: {
    adminType: "super_admin",
    joinedDate: "January 15, 2025",
    email: "admin@melodyverse.com"
  }
};

export const loadSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['general', 'api', 'security', 'notifications', 'adminProfile']);

    if (error) {
      console.warn('Failed to load settings from database:', error);
      return defaultSettings;
    }

    if (!data || data.length === 0) {
      return defaultSettings;
    }

    // Create a copy of default settings
    const loadedSettings = { ...defaultSettings };
    
    // Process each setting section individually
    data.forEach((setting) => {
      if (setting.key in loadedSettings && setting.value && typeof setting.value === 'object') {
        const sectionKey = setting.key as keyof SystemSettings;
        
        // Create a merged object for this specific section
        const mergedSectionData = {
          ...loadedSettings[sectionKey],
          ...setting.value
        };
        
        // Assign the merged data back to the settings object
        loadedSettings[sectionKey] = mergedSectionData as any;
      }
    });

    return loadedSettings;
  } catch (error) {
    console.warn('Error loading system settings:', error);
    return defaultSettings;
  }
};

export const saveSystemSettings = async (settings: SystemSettings): Promise<void> => {
  try {
    const settingsToSave = [
      { key: 'general', value: settings.general, category: 'general', description: 'General system settings' },
      { key: 'api', value: settings.api, category: 'api', description: 'API configuration settings' },
      { key: 'security', value: settings.security, category: 'security', description: 'Security and authentication settings' },
      { key: 'notifications', value: settings.notifications, category: 'notifications', description: 'Notification preferences' },
      { key: 'adminProfile', value: settings.adminProfile, category: 'admin', description: 'Admin profile settings' }
    ];

    for (const setting of settingsToSave) {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: setting.key,
          value: setting.value,
          category: setting.category,
          description: setting.description,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error(`Failed to save ${setting.key} settings:`, error);
        throw new Error(`Failed to save ${setting.key} settings`);
      }
    }
  } catch (error) {
    console.error('Error saving system settings:', error);
    throw error;
  }
};
