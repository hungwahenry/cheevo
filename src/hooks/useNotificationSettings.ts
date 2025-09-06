import { useState, useEffect } from 'react';
import { NotificationService, type NotificationSettings } from '@/src/services/notification.service';

const DEFAULT_SETTINGS: NotificationSettings = {
  socialNotifications: true,
  contentNotifications: true,
  trendingNotifications: false,
  communityNotifications: true,
};

interface UseNotificationSettingsReturn extends NotificationSettings {
  loading: boolean;
  error?: string;
  updateSetting: <K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Load settings from backend
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(undefined);
      
      const response = await NotificationService.getNotificationSettings();
      if (response.success) {
        setSettings(response.data);
      } else {
        // If failed, use defaults but still show error if it's not just "not authenticated"
        if (!response.error.includes('Not authenticated')) {
          setError(response.error);
        }
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      setError('Failed to load settings');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ) => {
    try {
      setError(undefined);
      
      // Optimistically update UI
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      // Update on backend
      const response = await NotificationService.updateNotificationSetting(key, value);
      if (response.success) {
        setSettings(response.data);
      } else {
        // Revert on error
        setSettings(settings);
        setError(response.error);
      }
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      // Revert on error
      setSettings(settings);
      setError('Failed to update setting');
    }
  };

  const resetToDefaults = async () => {
    try {
      setError(undefined);
      setLoading(true);
      
      const response = await NotificationService.resetNotificationSettings();
      if (response.success) {
        setSettings(response.data);
      } else {
        setError(response.error);
      }
    } catch (error) {
      console.error('Failed to reset notification settings:', error);
      setError('Failed to reset settings');
    } finally {
      setLoading(false);
    }
  };

  return {
    ...settings,
    loading,
    error,
    updateSetting,
    resetToDefaults,
  };
}