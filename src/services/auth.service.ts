
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/src/types/api';
import { UserProfile } from '@/src/types/user';
import { Session, User } from '@supabase/supabase-js';

export class AuthService {
  /**
   * Get current session
   */
  static async getSession(): Promise<ApiResponse<Session | null>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: session };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get session' 
      };
    }
  }

  /**
   * Send OTP to email address
   */
  static async sendOTP(email: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send OTP' 
      };
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(email: string, token: string): Promise<ApiResponse<{ user: User; session: Session; isNewUser: boolean }>> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: token.trim(),
        type: 'email',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Invalid OTP code' };
      }

      // Check if this is a new user (created_at equals last_sign_in_at)
      const isNewUser = data.user.created_at === data.user.last_sign_in_at;

      return { 
        success: true, 
        data: { 
          user: data.user, 
          session: data.session,
          isNewUser 
        } 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify OTP' 
      };
    }
  }

  /**
   * Complete user onboarding with username and university
   */
  static async completeOnboarding(username: string, universityId: number): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          university_id: universityId,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Failed to update user profile' };
      }

      return { success: true, data: data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete onboarding' 
      };
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign out' 
      };
    }
  }

  /**
   * Check if user has completed onboarding
   */
  static hasCompletedOnboarding(user: User | UserProfile | null): boolean {
    // Handle User type (from Supabase)
    if (user && 'user_metadata' in user) {
      if (!user?.user_metadata) return false;
      const { username, university_id, onboarding_completed } = user.user_metadata;
      return !!(username && university_id && onboarding_completed);
    }
    
    // Handle UserProfile type (from our app)
    if (user && 'onboardingCompleted' in user) {
      return !!(user.username && user.universityId && user.onboardingCompleted);
    }
    
    return false;
  }

  /**
   * Check if username is available
   */
  static async checkUsernameAvailability(username: string): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .rpc('check_username_availability', { 
          username_to_check: username.toLowerCase().trim() 
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check username availability'
      };
    }
  }

  /**
   * Get user profile from metadata
   */
  static getUserProfile(user: User | null): UserProfile | null {
    if (!user?.user_metadata) return null;

    return {
      id: user.id,
      email: user.email || '',
      username: user.user_metadata.username || '',

      universityId: user.user_metadata.university_id || null,
      onboardingCompleted: user.user_metadata.onboarding_completed || false,
      createdAt: user.created_at || '',
    };
  }
}