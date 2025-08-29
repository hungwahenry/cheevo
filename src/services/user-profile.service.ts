import { supabase } from '@/lib/supabase';
import { Database } from '@/src/types/database.generated';
import { UserProfile } from '@/src/types/user';

type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

export interface UserProfileServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class UserProfileService {
  /**
   * Get user profile by ID (with university info)
   */
  async getUserProfile(userId: string): Promise<UserProfileServiceResponse<UserProfile>> {
    try {
      // Get user profile (separated queries to avoid complex join issues)
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (!profile) {
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      // Get university info separately to avoid complex join issues
      const { data: university, error: uniError } = await supabase
        .from('universities')
        .select('id, name, short_name, state')
        .eq('id', profile.university_id)
        .single();

      // University fetch error is not critical - we can proceed without it
      if (uniError) {
        console.warn('University lookup failed:', uniError.message);
      }
      
      // Transform database format to UserProfile type
      const userProfile: UserProfile = {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        universityId: profile.university_id,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        postsCount: profile.posts_count || 0,
        reactionsReceived: profile.reactions_received || 0,
        commentsCount: profile.comments_count || 0,
        totalViews: profile.total_views || 0,
        trendingScore: Number(profile.trending_score) || 0,
        university: university ? {
          id: university.id,
          name: university.name,
          shortName: university.short_name,
          state: university.state,
        } : undefined,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };

      return {
        success: true,
        data: userProfile
      };

    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create user profile during onboarding
   */
  async createUserProfile(
    userId: string,
    username: string,
    email: string,
    universityId: number
  ): Promise<UserProfileServiceResponse<UserProfile>> {
    try {
      // Use the database function for consistency
      const { error: createError } = await supabase.rpc('create_user_profile', {
        user_uuid: userId,
        username_param: username,
        email_param: email,
        university_id_param: universityId
      });

      if (createError) {
        return {
          success: false,
          error: createError.message
        };
      }

      // Fetch the created profile
      const profileResult = await this.getUserProfile(userId);
      return profileResult;

    } catch (error) {
      console.error('Error creating user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'bio' | 'avatarUrl'>>
  ): Promise<UserProfileServiceResponse<UserProfile>> {
    try {
      const updateData: UserProfileUpdate = {};
      
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }

      // Fetch updated profile
      const profileResult = await this.getUserProfile(userId);
      return profileResult;

    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<UserProfileServiceResponse<boolean>> {
    try {
      const { data: isAvailable, error } = await supabase
        .rpc('check_username_availability', {
          username_to_check: username
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: isAvailable
      };

    } catch (error) {
      console.error('Error checking username availability:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user posts (for profile view)
   */
  async getUserPosts(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          giphy_url,
          reactions_count,
          comments_count,
          views_count,
          trending_score,
          is_trending,
          created_at,
          universities(name, short_name)
        `)
        .eq('user_id', userId)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: posts
      };

    } catch (error) {
      console.error('Error fetching user posts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Manually trigger user stats update (if needed)
   */
  async updateUserStats(userId: string): Promise<UserProfileServiceResponse<void>> {
    try {
      const { error } = await supabase.rpc('update_user_stats', {
        user_uuid: userId
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Error updating user stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const userProfileService = new UserProfileService();