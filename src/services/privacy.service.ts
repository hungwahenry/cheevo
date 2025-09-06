import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/src/types/api';

export type ProfileVisibility = 'everyone' | 'university' | 'nobody';
export type ContentEngagement = 'everyone' | 'university';

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  whoCanReact: ContentEngagement;
  whoCanComment: ContentEngagement;
}

export interface BlockedUser {
  id: number;
  blocked_user_id: string;
  created_at: string;
  blocked_user_info?: {
    username: string;
    university_name?: string;
  };
}

export class PrivacyService {
  /**
   * Update user privacy settings
   */
  static async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<ApiResponse<PrivacySettings>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('update-privacy-settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          profileVisibility: settings.profileVisibility,
          whoCanReact: settings.whoCanReact,
          whoCanComment: settings.whoCanComment,
        }
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to update privacy settings' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to update privacy settings' };
      }

      // Convert snake_case response to camelCase
      const privacySettings: PrivacySettings = {
        profileVisibility: data.settings.profile_visibility,
        whoCanReact: data.settings.who_can_react,
        whoCanComment: data.settings.who_can_comment,
      };

      return { success: true, data: privacySettings };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update privacy settings' 
      };
    }
  }

  /**
   * Get user's current privacy settings
   */
  static async getPrivacySettings(): Promise<ApiResponse<PrivacySettings>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('profile_visibility, who_can_react, who_can_comment')
        .eq('id', session.user.id)
        .single();

      if (error) {
        return { success: false, error: error.message || 'Failed to get privacy settings' };
      }

      const privacySettings: PrivacySettings = {
        profileVisibility: profile.profile_visibility || 'university',
        whoCanReact: profile.who_can_react || 'everyone',
        whoCanComment: profile.who_can_comment || 'everyone',
      };

      return { success: true, data: privacySettings };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get privacy settings' 
      };
    }
  }

  /**
   * Block a user
   */
  static async blockUser(targetUserId: string): Promise<ApiResponse<void>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('manage-blocked-users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          action: 'block',
          targetUserId
        }
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to block user' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to block user' };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to block user' 
      };
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(targetUserId: string): Promise<ApiResponse<void>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('manage-blocked-users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          action: 'unblock',
          targetUserId
        }
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to unblock user' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to unblock user' };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unblock user' 
      };
    }
  }

  /**
   * Get list of blocked users
   */
  static async getBlockedUsers(): Promise<ApiResponse<BlockedUser[]>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('manage-blocked-users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {
          action: 'list'
        }
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to get blocked users' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to get blocked users' };
      }

      return { success: true, data: data.data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get blocked users' 
      };
    }
  }
}