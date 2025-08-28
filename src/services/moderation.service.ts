import { supabase } from '@/lib/supabase';

export interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  action: 'approved' | 'removed' | 'manual_review';
  violations: string[];
  openaiResponse?: any;
  shouldBanUser?: boolean;
  banDuration?: number;
}

class ModerationService {

  async moderateContent(
    content: string,
    contentType: 'post' | 'comment',
    contentId: number,
    userId: string
  ): Promise<ModerationResult> {
    try {
      // Call Edge Function for server-side moderation
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: {
          content,
          contentType,
          contentId,
          userId
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        // Return safe default on error
        return {
          approved: false,
          flagged: false,
          action: 'manual_review',
          violations: [],
        };
      }

      return data;

    } catch (error) {
      console.error('Error calling moderation Edge Function:', error);
      
      // Return safe default on error
      return {
        approved: false,
        flagged: false,
        action: 'manual_review',
        violations: [],
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