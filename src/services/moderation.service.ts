import { supabase } from '@/lib/supabase';

export interface ModerationResult {
  success: boolean;
  approved: boolean;
  flagged: boolean;
  action: 'approved' | 'removed' | 'manual_review';
  violations: string[];
  openaiResponse?: any;
  error?: string;
  timestamp: string;
}

class ModerationService {

  async moderateContent(
    content: string,
    contentType: 'post' | 'comment',
    contentId: number,
    userId: string
  ): Promise<ModerationResult> {
    try {
      // Validate request
      if (!content?.trim()) {
        return {
          success: false,
          approved: false,
          flagged: true,
          action: 'manual_review',
          violations: ['empty_content'],
          error: 'Content cannot be empty',
          timestamp: new Date().toISOString()
        };
      }

      if (!contentType || !['post', 'comment'].includes(contentType)) {
        return {
          success: false,
          approved: false,
          flagged: true,
          action: 'manual_review',
          violations: ['invalid_content_type'],
          error: 'Invalid content type',
          timestamp: new Date().toISOString()
        };
      }

      if (!userId?.trim()) {
        return {
          success: false,
          approved: false,
          flagged: true,
          action: 'manual_review',
          violations: ['missing_user_id'],
          error: 'User ID is required',
          timestamp: new Date().toISOString()
        };
      }

      const { data: { session } } = await supabase.auth.getSession();

      // Call Edge Function for server-side content filtering
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {},
        body: {
          content: content.trim(),
          contentType,
          contentId,
          userId: userId.trim()
        }
      });

      if (error) {
        console.error('Moderation Edge Function error:', error);
        
        // Return appropriate error responses based on error type
        let violations = ['moderation_service_error'];
        if (error.message?.includes('OPENAI_API_KEY not configured')) {
          violations = ['moderation_service_unavailable'];
        } else if (error.message?.includes('Content cannot be empty')) {
          violations = ['empty_content'];
        } else if (error.message?.includes('Invalid content type')) {
          violations = ['invalid_content_type'];
        }

        // Return safe default on error - flag for manual review
        return {
          success: false,
          approved: false,
          flagged: true,
          action: 'manual_review',
          violations,
          error: error.message || 'Moderation service error',
          timestamp: new Date().toISOString()
        };
      }

      return data;

    } catch (error) {
      console.error('Error calling moderation Edge Function:', error);
      
      // Return safe default on error - flag for manual review
      return {
        success: false,
        approved: false,
        flagged: true,
        action: 'manual_review',
        violations: ['unexpected_error'],
        error: error instanceof Error ? error.message : 'Unexpected error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkUserBanStatus(userId: string): Promise<{
    isBanned: boolean;
    banType?: 'shadow_ban' | 'permanent_ban';
    expiresAt?: string | null;
  }> {
    const { data: activeBans, error } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking user ban status:', error);
      return { isBanned: false };
    }

    if (activeBans && activeBans.length > 0) {
      const ban = activeBans[0];
      return {
        isBanned: true,
        banType: ban.ban_type,
        expiresAt: ban.expires_at,
      };
    }

    return { isBanned: false };
  }
}

export const moderationService = new ModerationService();