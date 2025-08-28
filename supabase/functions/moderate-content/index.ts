import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
interface ModerationRequest {
  content: string;
  contentType: 'post' | 'comment';
  contentId?: number;
  userId: string;
}

interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  action: 'approved' | 'removed' | 'manual_review';
  violations: string[];
  openaiResponse: any;
  shouldBanUser?: boolean;
  banDuration?: number;
}

interface ModerationConfig {
  category: string;
  threshold: number;
  auto_action: 'approved' | 'removed' | 'manual_review';
  applies_to: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Parse request
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { content, contentType, contentId, userId }: ModerationRequest = await req.json();

    if (!content || !contentType || !userId) {
      return new Response('Missing required fields', { status: 400 });
    }

    console.log(`Moderating ${contentType} from user ${userId}`);

    // Load moderation configs
    const { data: moderationConfigs, error: configError } = await supabase
      .from('moderation_config')
      .select('*');

    if (configError) {
      console.error('Failed to load moderation config:', configError);
      return new Response('Configuration error', { status: 500 });
    }

    // Call OpenAI Moderation API
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: content,
      }),
    });

    if (!moderationResponse.ok) {
      const errorText = await moderationResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response('Moderation service error', { status: 500 });
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results[0];

    // Analyze violations and determine action
    const violations: string[] = [];
    let highestAction: 'approved' | 'manual_review' | 'removed' = 'approved';
    let flagged = result.flagged;

    // Check each category against thresholds
    for (const [category, score] of Object.entries(result.category_scores)) {
      const config = moderationConfigs?.find(c => c.category === category);
      
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
      openaiResponse: moderationData,
    };

    // Log moderation result
    const { error: logError } = await supabase
      .from('moderation_logs')
      .insert({
        content_type: contentType,
        content_id: contentId || 0,
        content_text: content,
        openai_response: moderationData,
        flagged,
        action_taken: highestAction,
      });

    if (logError) {
      console.error('Failed to log moderation:', logError);
      // Don't fail the request for logging errors
    }

    // Handle user violations and potential bans
    if (violations.length > 0) {
      const banInfo = await handleUserViolation(supabase, userId, violations, moderationData);
      if (banInfo) {
        moderationResult.shouldBanUser = true;
        moderationResult.banDuration = banInfo.banDuration;
      }
    }

    return new Response(JSON.stringify(moderationResult), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Moderation function error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

async function handleUserViolation(
  supabase: any,
  userId: string,
  violations: string[],
  openaiResponse: any
): Promise<{ banDuration: number } | null> {
  try {
    // Get ban escalation settings from app config
    const { data: appConfigs, error: configError } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['first_ban_days', 'second_ban_days', 'third_ban_days', 'fourth_ban_days', 'max_ban_days', 'ban_escalation_reset_days']);

    if (configError) {
      console.error('Failed to load ban settings:', configError);
      return null;
    }

    // Parse config values
    const config = {};
    appConfigs?.forEach(item => {
      config[item.key] = parseInt(item.value);
    });

    const banEscalationResetDays = config['ban_escalation_reset_days'] || 90;

    // Get user's violation history (last 90 days)
    const { data: banHistory, error: historyError } = await supabase
      .from('user_ban_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - banEscalationResetDays * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('Failed to fetch ban history:', historyError);
      return null;
    }

    const violationCount = (banHistory?.length || 0) + 1;
    
    // Determine ban duration based on escalation settings
    let banDuration: number;
    if (violationCount === 1) banDuration = config['first_ban_days'] || 7;
    else if (violationCount === 2) banDuration = config['second_ban_days'] || 14;
    else if (violationCount === 3) banDuration = config['third_ban_days'] || 28;
    else if (violationCount === 4) banDuration = config['fourth_ban_days'] || 56;
    else banDuration = config['max_ban_days'] || 180;

    const expiresAt = new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000);
    const banType = banDuration >= (config['max_ban_days'] || 180) ? 'permanent_ban' : 'shadow_ban';

    // Create user ban record
    const { error: banError } = await supabase
      .from('user_bans')
      .insert({
        user_id: userId,
        ban_type: banType,
        violation_count: violationCount,
        ban_duration_days: banDuration,
        expires_at: banType === 'permanent_ban' ? null : expiresAt.toISOString(),
        reason: `Moderation violation: ${violations.join(', ')}`,
        is_active: true,
      });

    if (banError) {
      console.error('Failed to create user ban:', banError);
      return null;
    }

    // Add to ban history
    const { error: historyError2 } = await supabase
      .from('user_ban_history')
      .insert({
        user_id: userId,
        violation_type: violations.join(', '),
        ban_duration_days: banDuration,
        moderation_score: openaiResponse,
      });

    if (historyError2) {
      console.error('Failed to log ban history:', historyError2);
    }

    console.log(`Applied ${banType} to user ${userId} for ${banDuration} days`);
    return { banDuration };

  } catch (error) {
    console.error('Error handling user violation:', error);
    return null;
  }
}