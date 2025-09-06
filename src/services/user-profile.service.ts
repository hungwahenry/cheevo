import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/src/types/user';
import { ApiResponse } from '@/src/types/api';
import { imageUploadService } from './image-upload.service';

class UserProfileService {
  /**
   * Get user profile by ID (with university info)
   */
  async getUserProfile(userId?: string): Promise<ApiResponse<UserProfile>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('get-user-profile', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: { userId }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to get user profile' };
    }

    return data;
  }

  /**
   * Create user profile during onboarding
   */
  async createUserProfile(
    username: string,
    universityId: number
  ): Promise<ApiResponse<UserProfile>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Use the database function to create profile
    const { error: createError } = await supabase.rpc('create_user_profile', {
      user_uuid: session.user.id,
      username_param: username.trim(),
      email_param: session.user.email || '',
      university_id_param: universityId
    });

    if (createError) {
      const errorMessage = createError.message?.includes('username')
        ? 'This username is already taken. Please choose a different one'
        : createError.message?.includes('foreign key')
        ? 'Invalid university selection. Please try again'
        : createError.message || 'Failed to create profile';
      
      return { success: false, error: errorMessage };
    }

    // Fetch the created profile
    return await this.getUserProfile(session.user.id);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    updates: Partial<Pick<UserProfile, 'bio' | 'avatarUrl'>>
  ): Promise<ApiResponse<UserProfile>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('update-user-profile', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: { bio: updates.bio, avatarUrl: updates.avatarUrl }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to update profile' };
    }

    return data;
  }

  /**
   * Update user profile with image upload
   */
  async updateUserProfileWithImage(
    updates: Partial<Pick<UserProfile, 'bio'>>,
    imageUri?: string
  ): Promise<ApiResponse<UserProfile>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    let avatarUrl: string | undefined = undefined;

    // Upload image if provided
    if (imageUri) {
      const uploadResult = await imageUploadService.uploadProfilePicture(
        session.user.id,
        imageUri
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      avatarUrl = uploadResult.data.url;
    }

    // Prepare update data
    const profileUpdates: Partial<Pick<UserProfile, 'bio' | 'avatarUrl'>> = {
      ...updates,
    };

    if (avatarUrl) {
      profileUpdates.avatarUrl = avatarUrl;
    }

    // Update profile with new data
    return await this.updateUserProfile(profileUpdates);
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<ApiResponse<boolean>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('check-username', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: { username: username.trim() }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to check username availability' };
    }

    return data;
  }

  /**
   * Get user posts (for profile view)
   */
  async getUserPosts(userId: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<any>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('get-user-posts', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: { userId, limit, offset }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to get user posts' };
    }

    return data;
  }

  /**
   * Get user comments (for profile view)
   */
  async getUserComments(userId: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<any>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('get-user-comments', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: { userId, limit, offset }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to get user comments' };
    }

    return data;
  }

  /**
   * Get user likes (posts they've reacted to)
   */
  async getUserLikes(userId: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<any>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('get-user-likes', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: { userId, limit, offset }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to get user likes' };
    }

    return data;
  }

}

export const userProfileService = new UserProfileService();