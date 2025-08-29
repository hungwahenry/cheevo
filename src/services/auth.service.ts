
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/src/types/api';
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
   * Validate current session is still active
   */
  static async validateSession(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
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
        // Enhanced error messages for better UX
        const errorMessage = error.message?.includes('rate limit') 
          ? 'Too many emails sent. Please wait before trying again'
          : error.message?.includes('email_address_invalid')
          ? 'Please enter a valid email address'
          : error.message || 'Failed to send verification code';
        
        return { success: false, error: errorMessage };
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
        // Enhanced error messages for OTP verification
        const errorMessage = error.message?.includes('otp_expired')
          ? 'Verification code has expired. Please request a new one'
          : error.message?.includes('invalid_credentials')
          ? 'The verification code you entered is incorrect'
          : error.message?.includes('email_not_confirmed')
          ? 'Please verify your email address first'
          : error.message || 'Failed to verify code';
        
        return { success: false, error: errorMessage };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Invalid verification code. Please try again' };
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
   * Complete user onboarding with username and university (now uses user_profiles table)
   */
  static async completeOnboarding(username: string, universityId: number): Promise<ApiResponse<User>> {
    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'Authentication session expired. Please sign in again' };
      }

      // Create user profile in our profiles table using the database function
      const { error: profileError } = await supabase.rpc('create_user_profile', {
        user_uuid: user.id,
        username_param: username.trim(),
        email_param: user.email || '',
        university_id_param: universityId
      });

      if (profileError) {
        // Enhanced error messages for profile creation
        const errorMessage = profileError.message?.includes('username')
          ? 'This username is already taken. Please choose a different one'
          : profileError.message?.includes('foreign key')
          ? 'Invalid university selection. Please try again'
          : profileError.message || 'Failed to create profile';
        
        return { success: false, error: errorMessage };
      }

      return { success: true, data: user };
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
   * Check if user has completed onboarding (now uses user_profiles table)
   */
  static async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      // If profile exists, onboarding is complete
      return !error && !!profile;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
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

}