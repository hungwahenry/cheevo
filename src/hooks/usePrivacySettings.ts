import { useState, useEffect } from 'react';
import { PrivacyService, type PrivacySettings, type ProfileVisibility, type ContentEngagement } from '@/src/services/privacy.service';

interface UsePrivacySettingsReturn {
  settings: PrivacySettings | null;
  loading: boolean;
  error: string | null;
  updateProfileVisibility: (visibility: ProfileVisibility) => Promise<boolean>;
  updateContentEngagement: (type: 'react' | 'comment', setting: ContentEngagement) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

export function usePrivacySettings(): UsePrivacySettingsReturn {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await PrivacyService.getPrivacySettings();
      
      if (response.success) {
        setSettings(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const updateProfileVisibility = async (visibility: ProfileVisibility): Promise<boolean> => {
    try {
      setError(null);
      const response = await PrivacyService.updatePrivacySettings({ profileVisibility: visibility });
      
      if (response.success) {
        setSettings(prev => prev ? { ...prev, profileVisibility: visibility } : null);
        return true;
      } else {
        setError(response.error);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile visibility');
      return false;
    }
  };

  const updateContentEngagement = async (type: 'react' | 'comment', setting: ContentEngagement): Promise<boolean> => {
    try {
      setError(null);
      const updateData = type === 'react' 
        ? { whoCanReact: setting }
        : { whoCanComment: setting };
      
      const response = await PrivacyService.updatePrivacySettings(updateData);
      
      if (response.success) {
        setSettings(prev => {
          if (!prev) return null;
          return type === 'react'
            ? { ...prev, whoCanReact: setting }
            : { ...prev, whoCanComment: setting };
        });
        return true;
      } else {
        setError(response.error);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update content engagement');
      return false;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateProfileVisibility,
    updateContentEngagement,
    refreshSettings
  };
}