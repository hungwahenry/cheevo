import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import { Database } from '@/src/types/database.generated';
import { configService } from './config.service';

type ModerationConfig = Database['public']['Tables']['moderation_config']['Row'];
type ModerationLog = Database['public']['Tables']['moderation_logs']['Insert'];
type UserBan = Database['public']['Tables']['user_bans']['Insert'];
type UserBanHistory = Database['public']['Tables']['user_ban_history']['Insert'];

export interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  action: 'approved' | 'removed' | 'manual_review';
  violations: string[];
  openaiResponse: any;
  shouldBanUser?: boolean;
  banDuration?: number;
}

class ModerationService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async moderateContent(
    content: string,
    contentType: 'post' | 'comment',
    contentId: number,
    userId: string
  ): Promise<ModerationResult> {
    try {
      // Call OpenAI moderation API
      const moderationResponse = await this.openai.moderations.create({
        model: 'omni-moderation-latest',
        input: content,
      });

      const result = moderationResponse.results[0];
      
      // Analyze violations and determine action
      const violations: string[] = [];
      let highestAction: 'approved' | 'manual_review' | 'removed' = 'approved';
      let flagged = result.flagged;

      // Check each category against thresholds
      for (const [category, score] of Object.entries(result.category_scores)) {
        const config = await configService.getModerationConfig(category);
        
        if (config && score >= config.threshold) {
          violations.push(category);
          
          // Determine the most severe action needed
          if (config.auto_action === 'removed') {
            highestAction = 'removed';
          } else if (config.auto_action === 'manual_review' && highestAction !== 'removed') {
            highestAction = 'manual_review';
          }
          
          // Override flagged if we exceed our custom thresholds
          flagged = true;
        }
      }

      const moderationResult: ModerationResult = {
        approved: highestAction === 'approved',
        flagged,
        action: highestAction,
        violations,
        openaiResponse: moderationResponse,
      };

      // Log moderation result
      await this.logModeration({
        content_type: contentType,
        content_id: contentId,
        content_text: content,
        openai_response: JSON.parse(JSON.stringify(moderationResponse)),
        flagged,
        action_taken: highestAction,
      });

      // Handle user violations and potential bans
      if (violations.length > 0) {
        const banInfo = await this.handleUserViolation(userId, violations, moderationResponse);
        if (banInfo) {
          moderationResult.shouldBanUser = true;
          moderationResult.banDuration = banInfo.banDuration;
        }
      }

      return moderationResult;

    } catch (error) {
      console.error('Error moderating content:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log the error and return safe default
      await this.logModeration({
        content_type: contentType,
        content_id: contentId,
        content_text: content,
        openai_response: { error: errorMessage },
        flagged: false,
        action_taken: 'manual_review', // Safe default on error
      });

      return {
        approved: false, // Safe default
        flagged: false,
        action: 'manual_review',
        violations: [],
        openaiResponse: { error: errorMessage },
      };
    }
  }

  private async logModeration(log: ModerationLog): Promise<void> {
    const { error } = await supabase
      .from('moderation_logs')
      .insert(log);

    if (error) {
      console.error('Error logging moderation:', error);
    }
  }

  private async handleUserViolation(
    userId: string,
    violations: string[],
    openaiResponse: any
  ): Promise<{ banDuration: number } | null> {
    try {
      // Get ban escalation settings from config
      const banSettings = await configService.getBanEscalationSettings();
      
      // Get user's violation history
      const { data: banHistory, error: historyError } = await supabase
        .from('user_ban_history')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - banSettings.banEscalationResetDays * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching ban history:', historyError);
        return null;
      }

      const violationCount = (banHistory?.length || 0) + 1;
      
      // Determine ban duration based on escalation settings from config
      let banDuration: number;
      if (violationCount === 1) banDuration = banSettings.firstBanDays;
      else if (violationCount === 2) banDuration = banSettings.secondBanDays;
      else if (violationCount === 3) banDuration = banSettings.thirdBanDays;
      else if (violationCount === 4) banDuration = banSettings.fourthBanDays;
      else banDuration = banSettings.maxBanDays;

      const expiresAt = new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000);
      const banType = banDuration >= banSettings.maxBanDays ? 'permanent_ban' : 'shadow_ban';

      // Create user ban record
      const userBan: UserBan = {
        user_id: userId,
        ban_type: banType,
        violation_count: violationCount,
        ban_duration_days: banDuration,
        expires_at: banType === 'permanent_ban' ? undefined : expiresAt.toISOString(),
        reason: `Moderation violation: ${violations.join(', ')}`,
        is_active: true,
      };

      const { error: banError } = await supabase
        .from('user_bans')
        .insert(userBan);

      if (banError) {
        console.error('Error creating user ban:', banError);
        return null;
      }

      // Add to ban history
      const banHistoryRecord: UserBanHistory = {
        user_id: userId,
        violation_type: violations.join(', '),
        ban_duration_days: banDuration,
        moderation_score: openaiResponse,
      };

      const { error: historyInsertError } = await supabase
        .from('user_ban_history')
        .insert(banHistoryRecord);

      if (historyInsertError) {
        console.error('Error logging ban history:', historyInsertError);
      }

      return { banDuration };

    } catch (error) {
      console.error('Error handling user violation:', error);
      return null;
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