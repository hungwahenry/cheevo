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
  static async verifyOTP(email: string, token: string): Promise<ApiResponse<{ user: User; session: Session }>> {
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

      return { 
        success: true, 
        data: { 
          user: data.user, 
          session: data.session,
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
   * Update user email address
   * This sends confirmation emails to both old and new addresses
   */
  static async updateUserEmail(newEmail: string): Promise<ApiResponse<void>> {
    try {
      const trimmedEmail = newEmail.toLowerCase().trim();
      
      const { error } = await supabase.auth.updateUser({
        email: trimmedEmail
      });
      
      if (error) {
        // Enhanced error messages for email updates
        const errorMessage = error.message?.includes('email_address_invalid')
          ? 'Please enter a valid email address'
          : error.message?.includes('same_email')
          ? 'This is already your current email address'
          : error.message?.includes('email_taken')
          ? 'This email address is already in use'
          : error.message?.includes('rate_limit')
          ? 'Too many email update attempts. Please wait before trying again'
          : error.message || 'Failed to update email address';
        
        return { success: false, error: errorMessage };
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update email address' 
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

  }