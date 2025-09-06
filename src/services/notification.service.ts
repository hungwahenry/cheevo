import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/src/types/api';

export interface NotificationSettings {
  socialNotifications: boolean;
  contentNotifications: boolean;
  trendingNotifications: boolean;
  communityNotifications: boolean;
}

export class NotificationService {
  /**
   * Get user's current notification settings
   */
  static async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('get-notification-settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to get notification settings' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to get notification settings' };
      }

      // Convert snake_case response to camelCase
      const notificationSettings: NotificationSettings = {
        socialNotifications: data.settings.social_notifications,
        contentNotifications: data.settings.content_notifications,
        trendingNotifications: data.settings.trending_notifications,
        communityNotifications: data.settings.community_notifications,
      };

      return { success: true, data: notificationSettings };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get notification settings' 
      };
    }
  }

  /**
   * Update user notification settings
   */
  static async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('update-notification-settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          socialNotifications: settings.socialNotifications,
          contentNotifications: settings.contentNotifications,
          trendingNotifications: settings.trendingNotifications,
          communityNotifications: settings.communityNotifications,
        }
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to update notification settings' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to update notification settings' };
      }

      // Convert snake_case response to camelCase
      const notificationSettings: NotificationSettings = {
        socialNotifications: data.settings.social_notifications,
        contentNotifications: data.settings.content_notifications,
        trendingNotifications: data.settings.trending_notifications,
        communityNotifications: data.settings.community_notifications,
      };

      return { success: true, data: notificationSettings };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update notification settings' 
      };
    }
  }

  /**
   * Update a single notification setting
   */
  static async updateNotificationSetting<K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ): Promise<ApiResponse<NotificationSettings>> {
    const partialSettings: Partial<NotificationSettings> = {
      [key]: value
    };
    
    return this.updateNotificationSettings(partialSettings);
  }

  /**
   * Reset notification settings to defaults
   */
  static async resetNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    const defaultSettings: NotificationSettings = {
      socialNotifications: true,
      contentNotifications: true,
      trendingNotifications: false,
      communityNotifications: true,
    };

    return this.updateNotificationSettings(defaultSettings);
  }
}