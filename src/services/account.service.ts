import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/src/types/api';

export class AccountService {
  /**
   * Delete user account permanently
   * User is already authenticated, no additional confirmation needed
   */
  static async deleteAccount(): Promise<ApiResponse<void>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: {}
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to delete account' };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to delete account' };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete account' 
      };
    }
  }
}