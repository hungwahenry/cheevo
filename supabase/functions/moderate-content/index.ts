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

