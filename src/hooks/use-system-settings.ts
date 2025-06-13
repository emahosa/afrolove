
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  description?: string;
  updated_at: string;
}

interface SettingsData {
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
}

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SettingsData>({
    general: {
      siteName: '',
      supportEmail: '',
      maximumFileSize: 0,
      autoDeleteDays: 0
    },
    api: {
      rateLimit: 0,
      cacheDuration: 0,
      enableThrottling: false,
      logApiCalls: false
    },
    security: {
      passwordMinLength: 0,
      passwordRequiresSymbol: false,
      sessionTimeout: 0,
      twoFactorEnabled: false
    },
    notifications: {
      emailNotifications: false,
      songCompletionNotices: false,
      systemAnnouncements: false,
      marketingEmails: false
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('Fetching system settings...');
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
        return;
      }

      console.log('Fetched settings:', data);

      // Transform the data into the expected format
      const transformedSettings: SettingsData = {
        general: {
          siteName: '',
          supportEmail: '',
          maximumFileSize: 0,
          autoDeleteDays: 0
        },
        api: {
          rateLimit: 0,
          cacheDuration: 0,
          enableThrottling: false,
          logApiCalls: false
        },
        security: {
          passwordMinLength: 0,
          passwordRequiresSymbol: false,
          sessionTimeout: 0,
          twoFactorEnabled: false
        },
        notifications: {
          emailNotifications: false,
          songCompletionNotices: false,
          systemAnnouncements: false,
          marketingEmails: false
        }
      };

      data.forEach((setting: SystemSetting) => {
        const { category, key, value } = setting;
        
        if (category === 'general') {
          switch (key) {
            case 'site_name':
              transformedSettings.general.siteName = value;
              break;
            case 'support_email':
              transformedSettings.general.supportEmail = value;
              break;
            case 'maximum_file_size':
              transformedSettings.general.maximumFileSize = Number(value);
              break;
            case 'auto_delete_days':
              transformedSettings.general.autoDeleteDays = Number(value);
              break;
          }
        } else if (category === 'api') {
          switch (key) {
            case 'rate_limit':
              transformedSettings.api.rateLimit = Number(value);
              break;
            case 'cache_duration':
              transformedSettings.api.cacheDuration = Number(value);
              break;
            case 'enable_throttling':
              transformedSettings.api.enableThrottling = Boolean(value);
              break;
            case 'log_api_calls':
              transformedSettings.api.logApiCalls = Boolean(value);
              break;
          }
        } else if (category === 'security') {
          switch (key) {
            case 'password_min_length':
              transformedSettings.security.passwordMinLength = Number(value);
              break;
            case 'password_requires_symbol':
              transformedSettings.security.passwordRequiresSymbol = Boolean(value);
              break;
            case 'session_timeout':
              transformedSettings.security.sessionTimeout = Number(value);
              break;
            case 'two_factor_enabled':
              transformedSettings.security.twoFactorEnabled = Boolean(value);
              break;
          }
        } else if (category === 'notifications') {
          switch (key) {
            case 'email_notifications':
              transformedSettings.notifications.emailNotifications = Boolean(value);
              break;
            case 'song_completion_notices':
              transformedSettings.notifications.songCompletionNotices = Boolean(value);
              break;
            case 'system_announcements':
              transformedSettings.notifications.systemAnnouncements = Boolean(value);
              break;
            case 'marketing_emails':
              transformedSettings.notifications.marketingEmails = Boolean(value);
              break;
          }
        }
      });

      setSettings(transformedSettings);
      console.log('Settings transformed and set:', transformedSettings);
    } catch (error) {
      console.error('Error in fetchSettings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (category: string, key: string, value: any) => {
    try {
      console.log(`Updating setting: ${category}.${key} = ${value}`);
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: value,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('category', category)
        .eq('key', key);

      if (error) {
        console.error('Error updating setting:', error);
        throw error;
      }

      console.log('Setting updated successfully');
    } catch (error) {
      console.error('Error in updateSetting:', error);
      throw error;
    }
  };

  const saveAllSettings = async () => {
    try {
      setSaving(true);
      console.log('Saving all settings...');

      const settingsToUpdate = [
        // General settings
        { category: 'general', key: 'site_name', value: settings.general.siteName },
        { category: 'general', key: 'support_email', value: settings.general.supportEmail },
        { category: 'general', key: 'maximum_file_size', value: settings.general.maximumFileSize },
        { category: 'general', key: 'auto_delete_days', value: settings.general.autoDeleteDays },
        
        // API settings
        { category: 'api', key: 'rate_limit', value: settings.api.rateLimit },
        { category: 'api', key: 'cache_duration', value: settings.api.cacheDuration },
        { category: 'api', key: 'enable_throttling', value: settings.api.enableThrottling },
        { category: 'api', key: 'log_api_calls', value: settings.api.logApiCalls },
        
        // Security settings
        { category: 'security', key: 'password_min_length', value: settings.security.passwordMinLength },
        { category: 'security', key: 'password_requires_symbol', value: settings.security.passwordRequiresSymbol },
        { category: 'security', key: 'session_timeout', value: settings.security.sessionTimeout },
        { category: 'security', key: 'two_factor_enabled', value: settings.security.twoFactorEnabled },
        
        // Notification settings
        { category: 'notifications', key: 'email_notifications', value: settings.notifications.emailNotifications },
        { category: 'notifications', key: 'song_completion_notices', value: settings.notifications.songCompletionNotices },
        { category: 'notifications', key: 'system_announcements', value: settings.notifications.systemAnnouncements },
        { category: 'notifications', key: 'marketing_emails', value: settings.notifications.marketingEmails },
      ];

      for (const setting of settingsToUpdate) {
        await updateSetting(setting.category, setting.key, setting.value);
      }

      toast.success('Settings saved successfully');
      console.log('All settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    setSettings,
    loading,
    saving,
    saveAllSettings,
    refetch: fetchSettings
  };
};
